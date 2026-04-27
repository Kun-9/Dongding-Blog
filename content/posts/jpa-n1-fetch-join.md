---
title: JPA N+1 — fetch join은 정답이 아니다
summary: >-
  fetch join을 쓰면 N+1은 사라지지만, paging이 깨지고 distinct가 필요해진다. BatchSize와의 진짜 차이를
  정리한다.
category: db
tags:
  - jpa
  - hibernate
  - performance
date: '2026-04-20'
visibility: published
---
## 문제 상황

주문 목록 화면에서 갑자기 응답이 8초로 늘었다는 알람이 왔다. 페이지당 20건을 보여주는 단순한 화면이었는데, 쿼리 로그를 켜 보니 한 페이지를 그릴 때마다 `SELECT` 쿼리가 60번 넘게 나가고 있었다. 우리 모두가 한 번씩은 만나는, 이름도 친절하게 붙여둔 **N+1 문제**다.

첫 본능은 당연히 `fetch join`이다. 사람들이 가장 먼저 권하는 답이고, 실제로 쿼리는 1개로 줄어든다. 그런데 그게 정말로 정답인가? 이 글은 그 질문에 대한 1년간의 시행착오를 정리한 것이다.

> [!INFO] 이 글이 다루는 범위
> Hibernate 6.x 기준이며, `OneToMany` 관계 위주로 본다. ManyToOne LAZY는 별도 장에서 다룰 것이다.

## LAZY 로딩과 N+1

엔티티는 다음과 같이 정의되어 있다. 모든 연관관계는 LAZY로 잡혀있다 — 그게 좋은 기본값이다.

```java:Order.java
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = LAZY)
    private Member member;

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items = new ArrayList<>();
}
```

그러면 주문 20개를 가져오는 코드를 보자. `orders.forEach(o -> o.getItems().size())` 같은 식으로 컬렉션을 한 번이라도 건드리면, 그 순간 20번의 추가 쿼리가 나간다. 이게 N+1이다.

## fetch join의 한계

JPQL에서 `JOIN FETCH`를 쓰면 단일 쿼리로 묶을 수 있다. 그런데 다음 코드에는 두 가지 함정이 있다.

```jpql:OrderRepository.java
SELECT DISTINCT o
FROM Order o
JOIN FETCH o.items
WHERE o.status = 'PAID'
ORDER BY o.createdAt DESC
```

> [!WARNING] MultipleBagFetchException
> `List`를 두 개 이상 fetch join 하면 Hibernate가 거부한다. `Set`으로 바꾸거나 `@OrderColumn`을 쓰는 우회법이 있지만, 진짜 문제는 따로 있다 — 컬렉션을 fetch join 하는 순간 페이징이 메모리에서 일어난다는 것.

### 페이징과의 충돌

`setMaxResults(20)`을 호출해도 SQL에 LIMIT이 붙지 않는다. 대신 모든 행을 가져와서 애플리케이션 메모리에서 잘라낸다. 데이터가 100만 건이라면? 100만 건이 다 올라오고, 그중 20건만 반환한다. 운영 환경에서 이건 사고다.

## BatchSize 전략

그래서 보통은 다음 절충안으로 간다 — `ToOne` 관계만 fetch join 하고, `ToMany`는 `BatchSize`로 묶는다.

```yaml:application.yml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100  # 조회 시 한 번에 100개씩 IN으로 묶어 가져옴
```

> [!TIP] batch_fetch_size, 얼마가 적당한가
> 너무 작으면 라운드트립이 늘고, 너무 크면 IN 절이 길어져 DB 옵티마이저가 헤맨다. 경험적으로는 100~500 사이가 안전하다. 정확한 수치는 슬로우 쿼리 로그로 확인하자.

## 정리

결국 정답은 "fetch join이 정답이 아니라, 상황에 맞는 도구를 골라 쓰는 게 정답"이라는 평범한 결론이다. ToOne은 fetch join, ToMany는 BatchSize, 페이징이 진짜 필요한 곳에는 별도 쿼리. 셋을 머릿속에 두고 코드를 짜면 N+1은 거의 만나지 않는다.

> [!NOTE] 다음 글
> `@EntityGraph`는 fetch join을 좀 더 선언적으로 쓰는 방법이다. 다음 글에서 이걸 BatchSize와 어떻게 조합하는지 다룬다.
