---
title: 'DFS와 BFS 개념 정리 및 풀이 (백준 1260 .JAVA )'
summary: 'DFS와 BFS의 개념을 정리하고 백준 1260번을 자바로 풀어본다.'
category: algorithm-study
tags:
  - dfs
  - java
  - algorithm
  - bfs
  - boj
date: '2023-12-03'
visibility: published
---
![](/posts/dfs-bfs-baekjoon-1260/img.png)

#### 문제와 함께 DFS, BFS에 대해 간단한 개념 정리를 해보겠습니다.

## 문제 설명
### 문제

그래프를 DFS로 탐색한 결과와 BFS로 탐색한 결과를 출력하는 프로그램을 작성하시오. 단, 방문할 수 있는 정점이 여러 개인 경우에는 정점 번호가 작은 것을 먼저 방문하고, 더 이상 방문할 수 있는 점이 없는 경우 종료한다. 정점 번호는 1번부터 N번까지이다.

### 입력

첫째 줄에 정점의 개수 N(1 ≤ N ≤ 1,000), 간선의 개수 M(1 ≤ M ≤ 10,000), 탐색을 시작할 정점의 번호 V가 주어진다. 다음 M개의 줄에는 간선이 연결하는 두 정점의 번호가 주어진다. 어떤 두 정점 사이에 여러 개의 간선이 있을 수 있다. 입력으로 주어지는 간선은 양방향이다.

### 출력

첫째 줄에 DFS를 수행한 결과를, 그다음 줄에는 BFS를 수행한 결과를 출력한다. V부터 방문된 점을 순서대로 출력하면 된다.

### 예제

![](/posts/dfs-bfs-baekjoon-1260/img_1.png)

## 문제 풀이
### 문제 분석

DFS와 BFS를 이용하여 탐색하는 문제입니다.

예제 입력2를 예시로 설명하겠습니다.

예제 입력2를 그래프로 나타내면 다음과 같습니다. 양 쪽 모두 이동할 수 있으므로 무방향 그래프에 해당합니다.

![](/posts/dfs-bfs-baekjoon-1260/IMG_0201.JPG)

### 입력받기

```java
public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

    StringTokenizer st1 = new StringTokenizer(br.readLine(), " ");

    n = Integer.parseInt(st1.nextToken());
    m = Integer.parseInt(st1.nextToken());
    int r = Integer.parseInt(st1.nextToken());
    result = new int[n];

    map = new HashMap<>();

    for (int i = 0; i < m; i++) {
        StringTokenizer st = new StringTokenizer(br.readLine(), " ");
        int a = Integer.parseInt(st.nextToken());
        int b = Integer.parseInt(st.nextToken());

        List<Integer> list1 = map.getOrDefault(a, new ArrayList<>());
        list1.add(b);
        map.put(a, list1);

        List<Integer> list2 = map.getOrDefault(b, new ArrayList<>());
        list2.add(a);
        map.put(b, list2);
    }

    for (Integer i : map.keySet()) {
        List<Integer> list = map.get(i);
        if (list == null) continue;
        Collections.sort(list);
    }

    solution(r);
}
```

Map을 이용하여 각 노드가 갈 수 있는 노드를 표현하였습니다.

갈 수 있는 간선이 여러 개라면 작은 노드부터 방문해야 하기 때문에, 각 리스트를 오름차순으로 정렬하였습니다.

### DFS(Depth First Search) 풀이

DFS는 깊이 우선 탐색이라고 부르고, 뜻 그대로 깊이를 우선하여 탐색합니다. 시작 노트를 방문하고 연결된 노드를 순차적으로 방문하며 마지막 노드 혹은 방문했던 노드라면 갈 수 있는 노드에 대해 DFS를 다시 수행합니다. 재귀와 스택을 이용하여 구현할 수 있으며, 해당 포스트에서는 재귀를 사용하여 구현하였습니다.

위의 그래프를 구현하기 쉽도록 트리로 나타내 보았습니다.

#### 트리 그림

![](/posts/dfs-bfs-baekjoon-1260/IMG_0202.JPG)

#### 중복 체크 후 트리 그림

![](/posts/dfs-bfs-baekjoon-1260/IMG_0203.JPG)

여기에서 check 배열을 만들어 중복을 확인할 것이므로 중복을 제거하면 다음과 같습니다.

#### 깊이 우선 탐색의 순서 그림

![](/posts/dfs-bfs-baekjoon-1260/img.jpg)

그림과 같이 시작노드(3)를 먼저 방문하고 왼쪽 방향의 마지막 노드인 5까지 방문 후 오른쪽 노드인 4를 방문합니다.

노드(5)에서 중복이 확인되었으므로 재귀가 종료됩니다.

#### DFS 풀이 코드

```java
private static void DFS(int r) {
    check[r] = 1;
    System.out.print(r + " ");

    List<Integer> integers = map.getOrDefault(r, new ArrayList<>());

    for (Integer integer : integers) {
        if (check[integer] == 1) continue;
        DFS(integer);
    }
}
```

### BFS(Breadth First Search) 풀이

BFS는 넓이 우선 탐색으로 DFS와 다르게 너비를 우선으로 탐색합니다. 깊이를 index라고 표현했을 때,

index 0의 노드들, 1의 노드들 ..... n의 노드들을 차례로 탐색합니다. Queue를 사용하여 구현할 수 있습니다.

#### BFS 탐색 순서 그림

![](/posts/dfs-bfs-baekjoon-1260/img_1.jpg)

그림과 같이 시작 노드(3)를 기준으로 가까운 노드를 우선적으로 탐색합니다.

#### 중복 제거 후 탐색 순서 그림

![](/posts/dfs-bfs-baekjoon-1260/img_2.jpg)

마찬가지로 중복된 (이미 다녀간) 노드는 다시 갈 필요가 없으므로, 제거한 뒤 탐색순서는 다음과 같습니다.

#### 작동 과정

1\. 큐에 시작 노드를 넣고 해당 노드를 방문처리 합니다.

2\. 큐에서 노드를 꺼내고 인접 노드의 방문 여부를 확인합니다.

3\. 방문하지 않았다면 방문처리 후, 큐에 인접 노드를 삽입합니다. 방문한 노드라면 아무 작업도 하지 않습니다.

4\. 큐에 비어있지 않다면 2 ~ 3을 반복합니다.

#### BFS 그림 과정

![](/posts/dfs-bfs-baekjoon-1260/img_3.jpg)

(1) 시작 노드인 3을 큐에 삽입하고 check 배열에 표기합니다.

(2) 큐에서 poll로 노드를 꺼냅니다.

(3) 꺼낸 노드 3의 인접 노드인 1과 4를 가져왔습니다.

(4) 1과 4 모두 check 배열의 값이 0이므로, 1로 변경한 뒤에 큐에 삽입합니다.

![](/posts/dfs-bfs-baekjoon-1260/img_4.jpg)

(1) 큐는 비어있지 않으므로 큐에서 poll로 노드를 꺼냅니다.

(2) 꺼낸 노드 2의 인접노드 2와 3을 가져옵니다.

(3) check 배열에서 2의 값은 0이지만 3의 값은 1이므로 check 배열의 2 값을 1로 변경하고 노드 2만 큐에 삽입합니다.

이렇게 인접노드가 이미 방문한 노드라면 더 이상 큐에 삽입하지 않기 때문에, 3 1 4 2 5 만 큐에 들어가고 출력됩니다.

#### BFS 풀이 코드

```java
private static void BFS(int r) {
    Queue<Integer> queue = new LinkedList<>();
    check[r] = 1;
    queue.offer(r);

    while (!queue.isEmpty()) {
        Integer poll = queue.poll();

        System.out.print(poll + " ");

        List<Integer> integers = map.getOrDefault(poll, new ArrayList<>());

        for (Integer integer : integers) {
            if (check[integer] == 0) {
                check[integer] = 1;
                queue.offer(integer);
            }
        }
    }
}
```

## 회고
BFS와 DFS에 대해서 다시 정리해 볼 수 있는 시간이었습니다. 이 두 탐색에 대한 개념이 확실히 잡혀있지 않으면 어려울 수 있는 문제라고 생각합니다.
