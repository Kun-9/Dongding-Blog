---
title: '백준 2468. 안전 영역 문제풀이 자바 (JAVA)'
summary: '백준 2468번 안전 영역 풀이.'
category: algorithm
tags: []
date: '2023-12-07'
visibility: published
---
![](/posts/baekjoon-2468-safe-area/10-2.png)

## 문제 설명
### 문제

재난방재청에서는 많은 비가 내리는 장마철에 대비해서 다음과 같은 일을 계획하고 있다. 먼저 어떤 지역의 높이 정보를 파악한다. 그 다음에 그 지역에 많은 비가 내렸을 때 물에 잠기지 않는 안전한 영역이 최대로 몇 개가 만들어 지는 지를 조사하려고 한다. 이때, 문제를 간단하게 하기 위하여, 장마철에 내리는 비의 양에 따라 일정한 높이 이하의 모든 지점은 물에 잠긴다고 가정한다.

어떤 지역의 높이 정보는 행과 열의 크기가 각각 N인 2차원 배열 형태로 주어지며 배열의 각 원소는 해당 지점의 높이를 표시하는 자연수이다. 예를 들어, 다음은 N=5인 지역의 높이 정보이다.

![](/posts/baekjoon-2468-safe-area/img.png)

이제 위와 같은 지역에 많은 비가 내려서 높이가 4 이하인 모든 지점이 물에 잠겼다고 하자. 이 경우에 물에 잠기는 지점을 회색으로 표시하면 다음과 같다.

![](/posts/baekjoon-2468-safe-area/img_1.png)

물에 잠기지 않는 안전한 영역이라 함은 물에 잠기지 않는 지점들이 위, 아래, 오른쪽 혹은 왼쪽으로 인접해 있으며 그 크기가 최대인 영역을 말한다. 위의 경우에서 물에 잠기지 않는 안전한 영역은 5개가 된다(꼭짓점으로만 붙어 있는 두 지점은 인접하지 않는다고 취급한다).

또한 위와 같은 지역에서 높이가 6이하인 지점을 모두 잠기게 만드는 많은 비가 내리면 물에 잠기지 않는 안전한 영역은 아래 그림에서와 같이 네 개가 됨을 확인할 수 있다.

![](/posts/baekjoon-2468-safe-area/img_2.png)

이와 같이 장마철에 내리는 비의 양에 따라서 물에 잠기지 않는 안전한 영역의 개수는 다르게 된다. 위의 예와 같은 지역에서 내리는 비의 양에 따른 모든 경우를 다 조사해 보면 물에 잠기지 않는 안전한 영역의 개수 중에서 최대인 경우는 5임을 알 수 있다.

어떤 지역의 높이 정보가 주어졌을 때, 장마철에 물에 잠기지 않는 안전한 영역의 최대 개수를 계산하는 프로그램을 작성하시오.

### 입력

첫째 줄에는 어떤 지역을 나타내는 2차원 배열의 행과 열의 개수를 나타내는 수 N이 입력된다. N은 2 이상 100 이하의 정수이다. 둘째 줄부터 N개의 각 줄에는 2차원 배열의 첫 번째 행부터 N번째 행까지 순서대로 한 행씩 높이 정보가 입력된다. 각 줄에는 각 행의 첫 번째 열부터 N번째 열까지 N개의 높이 정보를 나타내는 자연수가 빈 칸을 사이에 두고 입력된다. 높이는 1이상 100 이하의 정수이다.

### 출력

첫째 줄에 장마철에 물에 잠기지 않는 안전한 영역의 최대 개수를 출력한다.

### 예제

![](/posts/baekjoon-2468-safe-area/img_3.png)

## 문제 풀이
### 문제 분석

설명은 복잡해 보이지만, 결국 비에 잠긴 지역(지역의 숫자가 강수량 이하인 경우)을 기준으로 분리하고, 연결된 지역의 최대 개수를 구하는 문제입니다.

![](/posts/baekjoon-2468-safe-area/img_4.png)

왼쪽 그림은 4만큼의 비가 내렸을때의 그림입니다. 초록색 부분의 개수를 구하면 총 5가 나옵니다.

![](/posts/baekjoon-2468-safe-area/img_5.png)

6만큼의 비가 내렸을 때, 4개의 독립된 지역이 있음을 알 수 있습니다.

### 정리

\- 2차원 배열을 완전 탐색하며 해당 좌표에서 연결된 모든 노드를 탐색하고 표시한다. (DFS 탐색)

\- 각 강수량마다 탐색 횟수를 구하고, 최대 횟수를 결과로 저장한다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
N = Integer.parseInt(br.readLine());
map = new int[N][N];

for (int i = 0; i < N; i++) {
    StringTokenizer st = new StringTokenizer(br.readLine(), " ");
    for (int j = 0; j < N; j++) {
        map[i][j] = Integer.parseInt(st.nextToken());
    }
}
```

N x N 지도의 정보가 띄어쓰기로 구분되어 주어집니다.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N;
	static boolean[][] check;
	static int[][] map;
	static int[] moveX = {-1, 1, 0, 0};
	static int[] moveY = {0, 0, -1, 1};
	static boolean flag;

	public static void main(String[] args) throws IOException {
		int cnt;
		int result = Integer.MIN_VALUE;

		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		N = Integer.parseInt(br.readLine());
		map = new int[N][N];

		for (int i = 0; i < N; i++) {
			StringTokenizer st = new StringTokenizer(br.readLine(), " ");
			for (int j = 0; j < N; j++) {
				map[i][j] = Integer.parseInt(st.nextToken());
			}
		}

		for (int rainFall = 0; rainFall <= 100; rainFall++) {
			check = new boolean[N][N];
			cnt = 0;

			for (int i = 0; i < N; i++) {
				for (int j = 0; j < N; j++) {
					if (!check[i][j] && map[i][j] > rainFall) {
						flag = false;
						DFS(rainFall, i, j);
						if (flag) cnt++;
					}
				}
			}
			if (cnt == 0) break;
			result = Math.max(result, cnt);
		}

		System.out.print(result);
	}

	private static void DFS(int rainFall, int x, int y) {
		if (map[x][y] - rainFall <= 0 || check[x][y]) return;

		check[x][y] = true;
		flag = true;

		for (int i = 0; i < 4; i++) {
			int a = x + moveX[i];
			int b = y + moveY[i];

			if (a >= 0 && a < N && b >= 0 && b < N) {
				DFS(rainFall, a, b);
			}
		}
	}
}
```

## 회고
문제 이해에 조금 어려움을 겪었습니다. 그리고 DFS와 BFS 중 어떤 것을 선택해야 하는지 상황에 따라 잘 선택해야 할 것 같습니다. 해당 문제는 노드의 끝까지 완전탐색 하기 때문에, DFS를 사용하였습니다.
