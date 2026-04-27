---
title: '백준 2573. 빙산 문제풀이 자바 JAVA'
summary: '백준 2573번 빙산 풀이.'
category: algorithm-solve
tags: []
date: '2023-12-07'
visibility: published
---
![](/posts/baekjoon-2573-iceberg/12.png)

## 문제 설명
### 문제

지구 온난화로 인하여 북극의 빙산이 녹고 있다. 빙산을 그림 1과 같이 2차원 배열에 표시한다고 하자. 빙산의 각 부분별 높이 정보는 배열의 각 칸에 양의 정수로 저장된다. 빙산 이외의 바다에 해당되는 칸에는 0이 저장된다. 그림 1에서 빈칸은 모두 0으로 채워져 있다고 생각한다.

![](/posts/baekjoon-2573-iceberg/img.png)

빙산의 높이는 바닷물에 많이 접해있는 부분에서 더 빨리 줄어들기 때문에, 배열에서 빙산의 각 부분에 해당되는 칸에 있는 높이는 일 년마다 그 칸에 동서남북 네 방향으로 붙어있는 0이 저장된 칸의 개수만큼 줄어든다. 단, 각 칸에 저장된 높이는 0보다 더 줄어들지 않는다. 바닷물은 호수처럼 빙산에 둘러싸여 있을 수도 있다. 따라서 그림 1의 빙산은 일 년 후에 그림 2와 같이 변형된다.

그림 3은 그림 1의 빙산이 2년 후에 변한 모습을 보여준다. 2차원 배열에서 동서남북 방향으로 붙어있는 칸들은 서로 연결되어 있다고 말한다. 따라서 그림 2의 빙산은 한 덩어리이지만, 그림 3의 빙산은 세 덩어리로 분리되어 있다.

![](/posts/baekjoon-2573-iceberg/img_1.png)

한 덩어리의 빙산이 주어질 때, 이 빙산이 두 덩어리 이상으로 분리되는 최초의 시간(년)을 구하는 프로그램을 작성하시오. 그림 1의 빙산에 대해서는 2가 답이다. 만일 전부 다 녹을 때까지 두 덩어리 이상으로 분리되지 않으면 프로그램은 0을 출력한다.

### 입력

첫 줄에는 이차원 배열의 행의 개수와 열의 개수를 나타내는 두 정수 N과 M이 한 개의 빈칸을 사이에 두고 주어진다. N과 M은 3 이상 300 이하이다. 그 다음 N개의 줄에는 각 줄마다 배열의 각 행을 나타내는 M개의 정수가 한 개의 빈칸을 사이에 두고 주어진다. 각 칸에 들어가는 값은 0 이상 10 이하이다. 배열에서 빙산이 차지하는 칸의 개수, 즉, 1 이상의 정수가 들어가는 칸의 개수는 10,000 개 이하이다. 배열의 첫 번째 행과 열, 마지막 행과 열에는 항상 0으로 채워진다.

### 출력

첫 줄에 빙산이 분리되는 최초의 시간(년)을 출력한다. 만일 빙산이 다 녹을 때까지 분리되지 않으면 0을 출력한다.

### 예제

![](/posts/baekjoon-2573-iceberg/img_2.png)

## 문제 풀이
### 문제 분석

1년마다 탐색을 하며 상, 하, 좌, 우 방향에 빙산이 아닌 바다가 있을 때 (0일 때) 해당 빙산이 둘러쌓인 면만큼 녹입니다(상, 하가 0일 때 2 감소).

녹이는 것을 반복하다 빙산이 끊어질 때 (한번의 탐색으로 모든 빙산을 탐색할 수 없을 때)의 최초의 연도를 출력합니다.

#### 정리

\- 2차원 배열의 그래프(graph[N][M])를 입력받습니다.

\- 그래프를 순환하며 방문하지 않고 graph의 값이 0이 아닌 좌표에 대해 탐색을 시작합니다.

\- DFS혹은 BFS로 주어진 그래프의 인접 노드를 탐색하되, graph의 값이 0이라면 해당 노드의 값을 감소시킵니다.

\- 방문한 기록이 없으면서 graph의 값이 0이 아니라면 큐에 넣음을 반복합니다.

\- 모든 그래프 좌표에 대한 탐색이 종료되면 result의 값을 1 증가시킵니다.

\- 탐색의 횟수를 확인하고 그 수가 2 이상이라면 즉시 루프를 빠져나와 result를 출력합니다. (빙산이 분리된 경우)

\- 탐색의 횟수가 0이라면 0을 출력하고 종료합니다. (분리되지 않고 모두 녹은 경우)

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
StringTokenizer st = new StringTokenizer(br.readLine(), " ");

N = Integer.parseInt(st.nextToken());
M = Integer.parseInt(st.nextToken());

graph = new int[N][M];

for (int i = 0; i < N; i++) {
    StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
    for (int j = 0; j < M; j++) {
        graph[i][j] = Integer.parseInt(temp.nextToken());
    }
}
```

### 커스텀 클래스

```java
private static class Info {
    int x;
    int y;
    public Info(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }
}
```

이번 풀이에서는 좌표의 값을 전달하기 위해 Info 클래스를 작성하였습니다.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N, M;
	static boolean[][] check;
	static int[][] graph;
	static int[] moveX = {-1, 1, 0, 0};
	static int[] moveY = {0, 0, -1, 1};

	public static void main(String[] args) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		N = Integer.parseInt(st.nextToken());
		M = Integer.parseInt(st.nextToken());

		graph = new int[N][M];

		for (int i = 0; i < N; i++) {
			StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
			for (int j = 0; j < M; j++) {
				graph[i][j] = Integer.parseInt(temp.nextToken());
			}
		}
		int result = 0;

		loop:
		while (true) {
			int cnt = 0;
			check = new boolean[N][M];

			for (int i = 0; i < N; i++) {
				for (int j = 0; j < M; j++) {
					if (cnt >= 2) break loop;
					// i j 를 순환하며 BFS
					if (graph[i][j] != 0 && !check[i][j]) {
						BFS(new Info(i, j));
						cnt++;
					}
				}
			}

			// 분리되지 않는 경우
			if (cnt == 0) {
				result = 0;
				break;
			}

			result++;
		}

		System.out.print(result);
	}

	private static void BFS(Info info) {
		Queue<Info> queue = new LinkedList<>();

		queue.offer(info);
		check[info.getX()][info.getY()] = true;

		while (!queue.isEmpty()) {
			int len = queue.size();

			for (int i = 0; i < len; i++) {

				Info poll = queue.poll();

				int x = poll.getX();
				int y = poll.getY();

				for (int j = 0; j < 4; j++) {
					int tempX = x + moveX[j];
					int tempY = y + moveY[j];

					if (tempX >= 0 && tempX < N && tempY >= 0 && tempY < M ) {
						if (!check[tempX][tempY]) { // 방문한적 없는 노드일 때 (탐색하는 경우)
							if (graph[tempX][tempY] == 0) { // 해당 노드가 0일때 (녹는 경우)
								int value = graph[x][y];
								if (value != 0) graph[x][y] = --value;
								continue;
							}

							check[tempX][tempY] = true;
							queue.offer(new Info(tempX, tempY));
						}
					}
				}
			}
		}
	}

	private static class Info {
		int x;
		int y;
		public Info(int x, int y) {
			this.x = x;
			this.y = y;
		}

		public int getX() {
			return x;
		}

		public int getY() {
			return y;
		}
	}
}
```

## 회고
조건이 많아 조금 복잡했던 문제였습니다. 하지만 풀이에 대해서 크게 어려움은 없던 문제였습니다.
