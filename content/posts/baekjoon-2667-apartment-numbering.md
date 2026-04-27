---
title: '백준 2667. 단지번호붙이기 문제풀이 JAVA'
summary: '백준 2667번 단지번호붙이기 풀이.'
category: algorithm-solve
tags: []
date: '2023-12-05'
visibility: published
---
![](/posts/baekjoon-2667-apartment-numbering/10-2.png)

## 문제 설명
### 문제

<그림 1>과 같이 정사각형 모양의 지도가 있다. 1은 집이 있는 곳을, 0은 집이 없는 곳을 나타낸다. 철수는 이 지도를 가지고 연결된 집의 모임인 단지를 정의하고, 단지에 번호를 붙이려 한다. 여기서 연결되었다는 것은 어떤 집이 좌우, 혹은 아래위로 다른 집이 있는 경우를 말한다. 대각선상에 집이 있는 경우는 연결된 것이 아니다. <그림 2>는 <그림 1>을 단지별로 번호를 붙인 것이다. 지도를 입력하여 단지수를 출력하고, 각 단지에 속하는 집의 수를 오름차순으로 정렬하여 출력하는 프로그램을 작성하시오.

![](/posts/baekjoon-2667-apartment-numbering/image.png)

### 입력

첫 번째 줄에는 지도의 크기 N(정사각형이므로 가로와 세로의 크기는 같으며 5≤N≤25)이 입력되고, 그 다음 N줄에는 각각 N개의 자료(0혹은 1)가 입력된다.

### 출력

첫 번째 줄에는 총 단지수를 출력하시오. 그리고 각 단지내 집의 수를 오름차순으로 정렬하여 한 줄에 하나씩 출력하시오.

### 예제

![](/posts/baekjoon-2667-apartment-numbering/img.png)

## 문제 풀이
### 문제 분석

이전의 [백준 2178번 미로탐색](https://dong-ding.tistory.com/5) 문제와 매우 유사한 문제입니다. 때문에 자세한 설명은 생략하도록 하겠습니다. 이 문제는 미로탐색 문제와 달리 최단 거리를 구하는 것이 아닌, 모든 노드를 탐색하는 문제입니다. 하나의 '단지'를 탐색하는 DFS를 작성한 뒤, 방문하지 않은 노드이면서 지도의 값이 1인 노드를 순차적으로 탐색하면 해당 노드가 포함된 단지의 크기를 얻을 수 있습니다. 이 작업이 수행되는 횟수로 총 단지수를 구할 수 있습니다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

N = Integer.parseInt(br.readLine());

graph = new int[N][N];
check = new int[N][N];

for (int i = 0; i < N; i++) {
    String str = br.readLine();
    for (int j = 0; j < N; j++) {
        int value = Character.getNumericValue(str.charAt(j));
        graph[i][j] = value;
    }
}
```

정사각형 배열이므로 int[N][N] 배열을 만들어 입력받았습니다.

### DFS 코드

```java
private static void DFS(int i, int j) {
    if (i < 0 || i >= N || j < 0 || j >= N || check[i][j] == 1 || graph[i][j] == 0) return;

    check[i][j] = 1;
    cnt++;

    DFS(i + 1, j);
    DFS(i, j + 1);
    DFS(i - 1, j);
    DFS(i, j - 1);
}
```

graph배열과 크기가 같은 check배열로 방문 표시를 합니다. 이후 4방향으로의 DFS를 호출하고, 값의 유효 여부와 지도의 단지 여부 그리고 방문 여부를 확인합니다.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N;
	static int[][] graph;
	static int[][] check;
	static int cnt = 0;

	public static void main(String[] args) throws IOException {
		int totalCount = 0;
		List<Integer> result = new ArrayList<>();
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

		N = Integer.parseInt(br.readLine());

		graph = new int[N][N];
		check = new int[N][N];

		for (int i = 0; i < N; i++) {
			String str = br.readLine();
			for (int j = 0; j < N; j++) {
				int value = Character.getNumericValue(str.charAt(j));
				graph[i][j] = value;
			}
		}

		for (int i = 0; i < N; i++) {
			for (int j = 0; j < N; j++) {
				if (graph[i][j] == 1 && check[i][j] == 0) {
					totalCount++;
					DFS(i, j);
					result.add(cnt);
					cnt = 0;
				}
			}
		}

		System.out.println(totalCount);
		Collections.sort(result);
		for (Integer i : result) {
			System.out.println(i);
		}
	}

	private static void DFS(int i, int j) {
		if (i < 0 || i >= N || j < 0 || j >= N || check[i][j] == 1 || graph[i][j] == 0) return;

		check[i][j] = 1;
		cnt++;

		DFS(i + 1, j);
		DFS(i, j + 1);
		DFS(i - 1, j);
		DFS(i, j - 1);
	}
}
```

## 회고
이전에 풀어봤던 유형이라 쉽게 풀 수 있었습니다. 어렵게만 느껴졌던 DFS, BFS 탐색이 쉽게 느껴졌습니다. 다양한 문제를 풀며 체득해야 함을 체감할 수 있었습니다.
