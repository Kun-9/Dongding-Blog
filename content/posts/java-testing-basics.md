---
title: '자바의 테스트 간단 개념 정리'
summary: 'JUnit과 자바 테스트 작성의 기초 개념을 정리한다.'
category: java
tags:
  - test
  - java
  - spring
  - junit
  - spring-boot
date: '2023-12-04'
visibility: published
---
테스트에 대해 공부한 내용을 핵심만 정리해 놓은 포스트입니다. 예시 코드의 환경은 Java, Spring Boot이며, 스프링을 사용하는 테스트(@SpringBootTest)는 다루지 않았습니다.

## 테스트란?
테스트는 작성한 코드에 문제가 없는지 확인하고, 코드 변경이나 리팩토링 시에도 안정적인 동작을 보장하기 위해 수행합니다. 이는 코드의 신뢰성을 높이고 유지보수성을 강화하기 위한 목적으로 볼 수 있습니다. 또한, CI 과정에서 빌드 후 작성된 테스트를 실행시키고, 테스트를 통과해야만 서버에 배포할 수 있도록 자동화할 수 있습니다. CI/CD의 설명과 구축에 대한 설명은 [여기](https://dong-ding.tistory.com/2)에서 확인할 수 있습니다.

### 테스트 작성 패턴

각 테스트 메서드마다 @Test 어노테이션을 적어 테스트임을 명시합니다.

테스트 작성은 Given, When, Then 패턴을 따르는 것이 좋습니다. 사전 조건(Given), 실행 조건(When), 예상 결과(Then)로 명확하게 나누어 작성하면 가독성과 유지보수성이 향상됩니다.

```java
@Test
public void test() {
    // Given
    // 사전 조건 설정

    // When
    // 실행 조건 설정

    // Then
    // 예상 결과 확인
}
```

## 테스트 도구
테스트 도구는 언어에 따라 다양하게 제공되는데, Java에는 대표적으로 JUnit이 쓰이고 있습니다.

### 만약 테스트 도구가 없다면 어떻게 테스트를 했을까?

가장 먼저 떠오르는 방법은 기댓값과 출력값이 맞는지 boolean형태로 출력하여 확인하는 것입니다.

```
System.out.print("테스트 결과" + (expectedValue = actualValue));
```

이렇게 한다면 단순하게 메서드의 값이 잘 동작했는지 확인이 가능합니다.

하지만 이러한 방식은 개발자가 일일이 결과를 확인하고 적용하기 번거로울뿐더러, 여러 개의 테스트가 진행될 경우 실패에 대한 자세한 정보 또한 알 수 없어 어려움을 겪을 수 있습니다.

### JUnit

JUnit을 사용한 테스트에서는 assertEquals를 활용하여 검증할 수 있습니다. 이를 통해 테스트의 가독성과 유지보수성이 향상됩니다.

```
Assertions.assertEquals(expectedValue, actualValue);
```

테스트를 실행하면 테스트 성공과 실패 여부뿐만 아니라 기댓값과 출력 값 등 여러 정보를 표기해 주어 테스트에 대해 직관적으로 파악할 수 있습니다.

### assertJ와 JUnit

```java
@Test
public void test() {
    // Given
    int actualValue = 42;
    int expectedValue = 42;

    // Then

    // JUnit
    Assertions.assertEquals(expectedValue, actualValue);

    // assertJ
    Assertions.assertThat(actualValue).isEqualTo(expectedValue);
}
```

assertJ를 사용하면 JUnit보다 간결하고 가독성 높은 테스트 코드를 작성할 수 있습니다.

같은 Assertions이므로 import 경로를 잘 확인해야 함!

## 정상 플로우와 예외 플로우
위 테스트처럼 주어진 입력에 대해 코드가 정상적으로 동작하는지 검증하는 것이 정상 플로우입니다.

반면, 예외 플로우는 예상치 못한 상황에서도 적절하게 동작하는지를 검증합니다.

예를 들어 이름이 같은 멤버가 저장될 수 없는 서비스일 때, 같은 이름이 저장되려 하면 오류가 발생해야 합니다.

이것을 코드로 구현하면 다음과 같습니다.

```
@Test
public void validationDuplicate() {
    // given
    Member member1 = new Member();
    member1.setName("spring");

    Member member2 = new Member();
    member2.setName("spring");
    // member1과 member2의 이름이 같으므로 member2를 join하면 오류가 발생한다.

    // when
    memberService.join(member1);

    try {
        memberService.join(member2);
        fail(); // 두번째 멤버가 join 됐을때 오류가 발생해 catch로 넘어간다. 따라서 정상 작동에선 실행되지 않는다.
    } catch (IllegalStateException e) {
    	assertThat(e.getMessage()).isEqualTo("이미 존재하는 회원입니다.");
    }
}
```

이렇게 해도 테스트는 정상적으로 실행되지만, 테스트 도구에서 예외를 검증하기 위한 더 편리한 도구를 제공합니다.

```
// 변경 전 코드
try {
    memberService.join(member2);
    fail();
} catch (IllegalStateException e) {
    assertThat(e.getMessage()).isEqualTo("이미 존재하는 회원입니다.");
}

----------------------------------------------------------------------------

// 변경 후 코드
Assertions.assertThrows(IllegalStateException.class, ()
                    -> memberService.join(member2));
```

assertJ에서 제공하는 assertThrows는 발생 예외를 확인하고 테스트 결과를 반환합니다.

이처럼 테스트 도구는 검증할 값의 타입에 따라 다양한 메서드를 제공합니다.

## 재사용성
테스트를 작성할 때 유의해야 할 점 중 하나는 테스트의 재사용성입니다. 테스트는 한 번만 실행되는 것이 아니기 때문에, 코드에 변경이 생기고 테스트할 때마다 같은 환경에서 실행됨을 보장해야 합니다.

### 독립적인 테스트 케이스

테스트를 재사용하기 위해, 각 테스트 케이스는 독립적으로 실행될 수 있어야 합니다. 모든 테스트가 동시에 실행될 수 있지만, 한 테스트의 성공 혹은 실패가 다른 테스트에 영향을 주면 안 됩니다.

### @BeforeEach @AfterEach

이 두 애노테이션은 각 테스트의 이전마다 실행, 그리고 각 테스트의 이후마다 실행하는 코드를 설정할 수 있다.

테스트 실행 전에 초기 상태를 설정하고, 테스트 실행 후에는 잔여 자원을 정리하는 작업을 수행합니다. 이것으로 각 테스트가 독립적인 환경에서 실행될 수 있습니다. 스프링 테스트 환경에서는 @Transactional 애노테이션을 통해 간단히 구현할 수 있습니다.

```java
@BeforeEach
public void afterEach() {
    // 이와 같이 의존성을 주입할 수도 있다.
    A = new A();
    B = new B(A);
}

@AfterEach
public void afterEach() {
	test.clear();
}
```

출처 : 김영한, 스프링 입문 - 코드로 배우는 스프링 부트, 웹 MVC, DB 접근 기술
