---
title: '백준 7569. 토마토 문제풀이 자바 JAVA'
summary: '백준 7569번 토마토 풀이.'
category: algorithm
tags:
  - java
  - 알고리즘
  - algorithm
  - bfs
  - 백준
  - 코테
date: '2023-12-07'
visibility: published
---
![](/posts/baekjoon-7569-tomato/11.png)

## 문제 설명
### 문제

철수의 토마토 농장에서는 토마토를 보관하는 큰 창고를 가지고 있다. 토마토는 아래의 그림과 같이 격자모양 상자의 칸에 하나씩 넣은 다음, 상자들을 수직으로 쌓아 올려서 창고에 보관한다.

![](/posts/baekjoon-7569-tomato/image.png)

창고에 보관되는 토마토들 중에는 잘 익은 것도 있지만, 아직 익지 않은 토마토들도 있을 수 있다. 보관 후 하루가 지나면, 익은 토마토들의 인접한 곳에 있는 익지 않은 토마토들은 익은 토마토의 영향을 받아 익게 된다. 하나의 토마토에 인접한 곳은 위, 아래, 왼쪽, 오른쪽, 앞, 뒤 여섯 방향에 있는 토마토를 의미한다. 대각선 방향에 있는 토마토들에게는 영향을 주지 못하며, 토마토가 혼자 저절로 익는 경우는 없다고 가정한다. 철수는 창고에 보관된 토마토들이 며칠이 지나면 다 익게 되는지 그 최소 일수를 알고 싶어 한다.

토마토를 창고에 보관하는 격자모양의 상자들의 크기와 익은 토마토들과 익지 않은 토마토들의 정보가 주어졌을 때, 며칠이 지나면 토마토들이 모두 익는지, 그 최소 일수를 구하는 프로그램을 작성하라. 단, 상자의 일부 칸에는 토마토가 들어있지 않을 수도 있다.

### 입력

첫 줄에는 상자의 크기를 나타내는 두 정수 M,N과 쌓아올려지는 상자의 수를 나타내는 H가 주어진다. M은 상자의 가로 칸의 수, N은 상자의 세로 칸의 수를 나타낸다. 단, 2 ≤ M ≤ 100, 2 ≤ N ≤ 100, 1 ≤ H ≤ 100 이다. 둘째 줄부터는 가장 밑의 상자부터 가장 위의 상자까지에 저장된 토마토들의 정보가 주어진다. 즉, 둘째 줄부터 N개의 줄에는 하나의 상자에 담긴 토마토의 정보가 주어진다. 각 줄에는 상자 가로줄에 들어있는 토마토들의 상태가 M개의 정수로 주어진다. 정수 1은 익은 토마토, 정수 0 은 익지 않은 토마토, 정수 -1은 토마토가 들어있지 않은 칸을 나타낸다. 이러한 N개의 줄이 H번 반복하여 주어진다.

토마토가 하나 이상 있는 경우만 입력으로 주어진다.

### 출력

여러분은 토마토가 모두 익을 때까지 최소 며칠이 걸리는지를 계산해서 출력해야 한다. 만약, 저장될 때부터 모든 토마토가 익어있는 상태이면 0을 출력해야 하고, 토마토가 모두 익지는 못하는 상황이면 -1을 출력해야 한다.

### 예제

![](/posts/baekjoon-7569-tomato/img.png)

## 문제 풀이
### 문제 분석

3차원으로 주어진 배열에서 익은 토마토(1)가 인접한 안익은 토마토(0)를 익게 할 때 모두 익는 최소 날짜를 구하는 문제입니다.

주어진 3차원 배열을 box[M][N][H]라 할 때,

![시간 경과에 따른 변화. 1은 가장 처음에 익어있던 토마토의 위치](/posts/baekjoon-7569-tomato/img_1.png)

2차원 배열에서의

우 : box[M  + 1][N][H]

좌 : box[M - 1][N][H]

상 : box[M][N + 1][H]

하 : box[M][N - 1][H]

3차원 배열에서의

바로 위 요소 : box[M][N][H + 1]

바로 아래 요소 : box[M][N][H - 1]

가 익지 않은 토마토라면 1로 변경합니다.

최소 날짜를 구하는 문제이기 때문에 BFS를 사용합니다.

만약 토마토가 두 개 이상이라면 하루가 지났을 때, 모든 토마토는 인접한 토마토를 익게 하므로, 큐에 익은 토마토의 배열을 모두 넣고 BFS를 시작합니다. BFS가 끝나고 상자의 모든 토마토가 1이라면 종료 index를 출력하고, 0인 토마토가 존재한다면 모든 토마토가 익지 못하는 상황이기 때문에 -1을 출력합니다.

#### 정리

\- 3차원 배열을 입력받습니다. 이때 익은 토마토(1)의 위치를 저장합니다.

\- BFS 탐색을 시작합니다. 이때, 익은 토마토의 위치를 큐에 모두 넣고 수행합니다. (동시 수행을 위함)

\- 만약 탐색 시 하나의 토마토도 변경시키지 못했다면 탐색이 종료됩니다.

\- 모든 토마토가 익었다면 현재 index를, 아니라면 -1을 출력합니다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
StringTokenizer st = new StringTokenizer(br.readLine(), " ");

M = Integer.parseInt(st.nextToken());
N = Integer.parseInt(st.nextToken());
H = Integer.parseInt(st.nextToken());

box = new int[M][N][H];

List<int[]> ripenList = new ArrayList<>();

for (int h = 0; h < H; h++) {
    for (int n = 0; n < N; n++) {
        StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
        for (int m = 0; m < M; m++) {
            int value = Integer.parseInt(temp.nextToken());
            if (value == 1) ripenList.add(new int[]{m, n, h});
            box[m][n][h] = value;
        }
    }
}
```

```java
if (value == 1) ripenList.add(new int[]{m, n, h});
```

위 코드로 배열을 파싱 할 때, 익은 토마토의 리스트를 만들어 저장합니다.

### 풀이 코드

```java
package BOJ;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Boj_7569 {

	static int N, M, H;
	static int[][][] box;
	static boolean flag = false;

	public static void main(String[] args) throws IOException {

		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		M = Integer.parseInt(st.nextToken());
		N = Integer.parseInt(st.nextToken());
		H = Integer.parseInt(st.nextToken());

		box = new int[M][N][H];

		List<int[]> ripenList = new ArrayList<>();

		for (int h = 0; h < H; h++) {
			for (int n = 0; n < N; n++) {
				StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
				for (int m = 0; m < M; m++) {
					int value = Integer.parseInt(temp.nextToken());
					if (value == 1) ripenList.add(new int[]{m, n, h});
					box[m][n][h] = value;
				}
			}
		}
		System.out.println(BFS(ripenList));
	}

	private static int BFS(List<int[]> list) {
		if (isFinish()) return 0;

		Queue<int[]> queue = new LinkedList<>();
		int m; int n; int h;

		// 처음 익은 토마토들을 모두 큐에 넣는다.
		for (int[] ints : list) {
			queue.offer(new int[]{ints[0], ints[1], ints[2]});
		}

		int index = 0;

		while (!queue.isEmpty()) {
			int len = queue.size();
			flag = false;

			for (int i = 0; i < len; i++) {
				int[] poll = queue.poll();

				m = poll[0]; n = poll[1]; h = poll[2];

				validOffer(m + 1, n, h, queue);
				validOffer(m - 1, n, h, queue);
				validOffer(m, n + 1, h, queue);
				validOffer(m, n - 1, h, queue);
				validOffer(m, n, h + 1, queue);
				validOffer(m, n, h - 1, queue);
			}
			// 아무것도 변경시키지 못한다면
			if (!flag) {
				// 안익은 토마토가 있다면 -1 리턴
				if (!isFinish()) return -1;
				return index;
			}
			index++;
		}
		return -1;
	}

	private static void validOffer(int m, int n, int h, Queue<int[]> queue) {
		// 조건 통과하면 queue에 삽입
		if (!(m < 0 || m >= M || n < 0 || n >= N || h < 0 || h >= H)) {
			if (box[m][n][h] == 0) {
				flag = true;
				box[m][n][h] = 1;
				queue.offer(new int[]{m, n, h});
			}
		}
	}

	private static boolean isFinish() {
		for (int h = 0; h < H; h++) {
			for (int n = 0; n < N; n++) {
				for (int m = 0; m < M; m++) {
					if (box[m][n][h] == 0) return false;
				}
			}
		}
		return true;
	}
}
```

## 회고
익힘(?)이 동시에 진행되는 토마토를 구현하기 위해 최초 큐에 익은 요소들을 넣는 방법을 떠올린다면, 그 이후는 어렵지 않게 풀 수 있는 문제인 것 같습니다.
