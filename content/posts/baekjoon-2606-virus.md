---
title: '백준 2606. 바이러스 풀이 JAVA'
summary: '백준 2606번 바이러스 문제 풀이.'
category: algorithm-solve
tags: []
date: '2023-12-05'
visibility: published
---
![](/posts/baekjoon-2606-virus/img.png)

## 문제 설명
### 문제

신종 바이러스인 웜 바이러스는 네트워크를 통해 전파된다. 한 컴퓨터가 웜 바이러스에 걸리면 그 컴퓨터와 네트워크 상에서 연결되어 있는 모든 컴퓨터는 웜 바이러스에 걸리게 된다.

예를 들어 7대의 컴퓨터가 <그림 1>과 같이 네트워크 상에서 연결되어 있다고 하자. 1번 컴퓨터가 웜 바이러스에 걸리면 웜 바이러스는 2번과 5번 컴퓨터를 거쳐 3번과 6번 컴퓨터까지 전파되어 2, 3, 5, 6 네 대의 컴퓨터는 웜 바이러스에 걸리게 된다. 하지만 4번과 7번 컴퓨터는 1번 컴퓨터와 네트워크상에서 연결되어 있지 않기 때문에 영향을 받지 않는다.

![](/posts/baekjoon-2606-virus/img_1.png)

어느 날 1번 컴퓨터가 웜 바이러스에 걸렸다. 컴퓨터의 수와 네트워크 상에서 서로 연결되어 있는 정보가 주어질 때, 1번 컴퓨터를 통해 웜 바이러스에 걸리게 되는 컴퓨터의 수를 출력하는 프로그램을 작성하시오.

### 입력

첫째 줄에는 컴퓨터의 수가 주어진다. 컴퓨터의 수는 100 이하인 양의 정수이고 각 컴퓨터에는 1번부터 차례대로 번호가 매겨진다. 둘째 줄에는 네트워크 상에서 직접 연결되어 있는 컴퓨터 쌍의 수가 주어진다. 이어서 그 수만큼 한 줄에 한 쌍씩 네트워크 상에서 직접 연결되어 있는 컴퓨터의 번호 쌍이 주어진다.

### 출력

1번 컴퓨터가 웜 바이러스에 걸렸을 때, 1번 컴퓨터를 통해 웜 바이러스에 걸리게 되는 컴퓨터의 수를 첫째 줄에 출력한다.

### 예제

![](/posts/baekjoon-2606-virus/img_2.png)

## 문제 풀이
### 문제 분석

연결된 모든 노드를 탐색하는 문제입니다. 컴퓨터의 수는 노드의 수를, 쌍의 수는 간선의 수를 뜻합니다. 새로운 노드를 방문할 때마다 cnt를 증가시키고 탐색이 끝난 뒤 cnt를 출력하도록 작성하였습니다. 단순 탐색이기 때문에 DFS, BFS 탐색 모두 가능하며 해당 포스트에서는 DFS를 사용하여 풀어보았습니다.

![예제를 트리 형태로 변환](/posts/baekjoon-2606-virus/img.jpg)

예제 그래프를 이해하기 쉽도록 트리형태로 작성하고, DFS와 BFS의 탐색 순서를 기입하였습니다.

여기서 방문 노드 확인은 크기가 N+1인 check배열을 사용합니다.

### 입력 받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

// 컴퓨터의 수 (노드의 수)
N = Integer.parseInt(br.readLine());

// 쌍의 수 (간선의 수)
M = Integer.parseInt(br.readLine());

graph = new int[N + 1][N + 1];
check = new int[N + 1];

for (int i = 0; i < M; i++) {
    StringTokenizer st = new StringTokenizer(br.readLine(), " ");

    int a = Integer.parseInt(st.nextToken());
    int b = Integer.parseInt(st.nextToken());

    graph[a][b] = graph[b][a] = 1;
}
```

2차 배열을 사용하여 각 노드 간의 관계를 표현하였으며, n노드가 갈 수 있는 노드를 찾기 위해 graph[n][i]의 값이 1인 i를 탐색합니다.
무방향 그래프 형태이기 때문에, graph[a][b], graph[b][a] 모두 1을 할당하였습니다.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N, M;
	static int[][] graph;
	static int[] check;
	static int cnt = 0;

	public static void main(String[] args) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

		// 컴퓨터의 수 (노드의 수)
		N = Integer.parseInt(br.readLine());

		// 쌍의 수 (간선의 수)
		M = Integer.parseInt(br.readLine());

		graph = new int[N + 1][N + 1];
		check = new int[N + 1];

		for (int i = 0; i < M; i++) {
			StringTokenizer st = new StringTokenizer(br.readLine(), " ");

			int a = Integer.parseInt(st.nextToken());
			int b = Integer.parseInt(st.nextToken());

			graph[a][b] = graph[b][a] = 1;
		}
		DFS(0,1);

		System.out.print(cnt);
	}

	private static void DFS(int index, int current) {
		check[current] = 1;

		for (int i = 1; i <= N; i++) {
			if (graph[current][i] == 1 && check[i] == 0) {
				cnt++;
				DFS(index + 1, i);
			}
		}
	}
}
```

## 회고
DFS, BFS 기본 문제 중 하나였습니다.
