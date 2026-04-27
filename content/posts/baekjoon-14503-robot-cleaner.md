---
title: '백준 14503. 로봇 청소기 문제풀이 자바 JAVA'
summary: '백준 14503번 로봇 청소기 풀이.'
category: algorithm-solve
tags: []
date: '2023-12-13'
visibility: published
---
![](/posts/baekjoon-14503-robot-cleaner/11.png)

## 문제 설명
### 문제

로봇 청소기와 방의 상태가 주어졌을 때, 청소하는 영역의 개수를 구하는 프로그램을 작성하시오.

로봇 청소기가 있는 방은 N X M 크기의 직사각형으로 나타낼 수 있으며,  1 X 1 크기의 정사각형 칸으로 나누어져 있다. 각각의 칸은 벽 또는 빈칸이다. 청소기는 바라보는 방향이 있으며, 이 방향은 동, 서, 남, 북 중 하나이다. 방의 각 칸은 좌표 (r, c)로 나타낼 수 있고, 가장 북쪽 줄의 가장 서쪽 칸의 좌표가 (0, 0), 가장 남쪽 줄의 가장 동쪽 칸의 좌표가 (N-1, M-1)이다. 즉, 좌표 (r, c)는 북쪽에서 (r+1) 번째에 있는 줄의 서쪽에서 (c+1) 번째 칸을 가리킨다. 처음에 빈칸은 전부 청소되지 않은 상태이다.

로봇 청소기는 다음과 같이 작동한다.

현재 칸이 아직 청소되지 않은 경우, 현재 칸을 청소한다.
현재 칸의 주변 4칸 중 청소되지 않은 빈 칸이 없는 경우,
바라보는 방향을 유지한 채로 한 칸 후진할 수 있다면 한 칸 후진하고 1번으로 돌아간다.
바라보는 방향의 뒤쪽 칸이 벽이라 후진할 수 없다면 작동을 멈춘다.
현재 칸의 주변 4칸 중 청소되지 않은 빈 칸이 있는 경우,
반시계 방향으로 90도 회전한다.
바라보는 방향을 기준으로 앞쪽 칸이 청소되지 않은 빈칸인 경우 한 칸 전진한다.
1번으로 돌아간다.

### 입력

첫째 줄에 방의 크기 N과 M이 입력된다. (3 <= N, M <= 50) 둘째 줄에 처음에 로봇 청소기가 있는 칸의 좌표 (r, c)와 처음에 로봇 청소기가 바라보는 방향 d가 입력된다. d가 0인 경우 북쪽, 1인 경우 동쪽, 2인 경우 남쪽, 3인 경우 서쪽을 바라보고 있는 것이다.

셋째 줄부터 N개의 줄에 각 장소의 상태를 나타내는 N X M개의 값이 한 줄에 M 개씩 입력된다. i번째 줄의 j번째 값은 칸 (i, j)의 상태를 나타내며, 이 값이 0인 경우 (i, j)가 청소되지 않은 빈칸이고, 1인 경우 (i, j)에 벽이 있는 것이다. 방의 가장 북쪽, 가장 남쪽, 가장 서쪽, 가장 동쪽 줄 중 하나 이상에 위치한 모든 칸에는 벽이 있다. 로봇 청소기가 있는 칸은 항상 빈칸이다.

### 출력

로봇 청소기가 작동을 시작한 후 작동을 멈출 때까지 청소하는 칸의 개수를 출력한다.

### 예제

![](/posts/baekjoon-14503-robot-cleaner/img.png)

## 문제 풀이
### 문제 분석

#### 장애물과 탐색 조건

특정 지점부터 재귀로 탐색하며 더 이상 갈 수 없을 때 멈춥니다. 일반적으로 상, 하, 좌, 우 네 방향으로 탐색하는 문제와 달리, 바라보는 방향에 따라 탐색 경로가 정해지므로 단 한 가지 경로만 존재합니다. 즉 최종 노드(더 이상 갈 수 없는 노드)에 도달하도록 특정 조건만 잘 대입해서 구현하면 문제를 풀 수 있습니다.

먼저 주어진 입력을 보면, 외곽은 1 즉 벽으로 둘러싸여 있고 내부 또한 1로 장애물이 표시되어 있습니다.

때문에 1은 갈 수 없는 곳, 0은 청소되지 않은 곳, 청소한 곳은 2로 표시하며 청소가 되었음을 나타낼 수 있습니다.

```java
private static class Info {
    private final int x;
    private final int y;
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

좌표값 표현을 위한 class

```java
private static int validateValue(Info info) {
    int x = info.getX();
    int y = info.getY();

    if (y > 0 && y < M - 1 && x > 0 && x < N - 1) {
        if (map[x][y] != 1) {
            return map[x][y];
        }
    }
    return -1;
}
```

위 코드는 이동할 값을 파라미터로 넘겼을 때, 그 값이 유효하고 1이 아니라면 (벽이 아니라면) 그 값을 반환합니다.

```java
private static boolean setCheck(Info info) {
    int x = info.getX();
    int y = info.getY();

    if (map[x][y] == 0) {
        map[x][y] = 2;
        return true;
    }
    return false;
}
```

청소할 수 있는 칸이라면 해당 좌표의 값을 2로 변경합니다.

#### 방향

이제 청소기에 방향에 대해 분석해 보겠습니다. 로봇청소기는 동, 서, 남, 북 네 방향을 바라볼 수 있습니다. 좌표의 관점에서 동쪽으로 이동할 때 x의 값이 1 증가, 서쪽으로 이동할 때는 x의 값이 1 감소하는 것을 알 수 있습니다. 따라서

동 : x + 1, 서 : x - 1, 남 : y - 1, 북 : y + 1으로 표현할 수 있습니다.

```java
static int[] moveX = {-1, 0, 1, 0};
static int[] moveY = {0, 1, 0, -1};
```

이제 moveX와 moveY에 방향 값(d)을 대입하면 특정 방향으로 이동할 수 있습니다.

#### 회전

청소기는 주변에 청소할 수 있는 칸이 있다면 시계 반대방향으로 회전합니다.

즉, 북 -> 서 -> 남 -> 동으로 순차적으로 변경되므로

```java
private static void turn() {
    if (--d == -1) d = 3;
}
```

다음과 같이 방향을 1 감소시키고, 음수가 되면 3으로 초기화해주는 함수를 구현하였습니다.

#### 후진

후진은 바라보는 방향에 대해 반대로 진행됩니다. 따라서 방향 값에 -2 또는 +2를 하면 후진할 때의 방향 값을 얻을 수 있습니다.

```java
private static int back() {
    if (d <= 1) return d + 2;
    return d - 2;
}
```

#### 정리

\- 이 문제의 요소는 크게 탐색과 방향으로 나눌 수 있다.

\- 주어진 좌표로부터 DFS 탐색을 하되, 벽과 장애물에 유의한다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

StringTokenizer st = new StringTokenizer(br.readLine(), " ");

N = Integer.parseInt(st.nextToken());
M = Integer.parseInt(st.nextToken());

map = new int[N][M];

st = new StringTokenizer(br.readLine(), " ");

r = Integer.parseInt(st.nextToken());
c = Integer.parseInt(st.nextToken());
d = Integer.parseInt(st.nextToken());

for (int i = 0; i < N; i++) {
    st = new StringTokenizer(br.readLine(), " ");
    for (int j = 0; j < M; j++) {
        map[i][j] = Integer.parseInt(st.nextToken());
    }
}
```

### 풀이 코드

```java
package BOJ;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.StringTokenizer;

public class Boj_14503 {
	static int N, M, r, c, d;
	static int[][] map;
	static int[] moveX = {-1, 0, 1, 0};
	static int[] moveY = {0, 1, 0, -1};
	static int result = 0;

	public static void main(String[] args) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		N = Integer.parseInt(st.nextToken());
		M = Integer.parseInt(st.nextToken());

		map = new int[N][M];

		st = new StringTokenizer(br.readLine(), " ");

		r = Integer.parseInt(st.nextToken());
		c = Integer.parseInt(st.nextToken());
		d = Integer.parseInt(st.nextToken());

		for (int i = 0; i < N; i++) {
			st = new StringTokenizer(br.readLine(), " ");
			for (int j = 0; j < M; j++) {
				map[i][j] = Integer.parseInt(st.nextToken());
			}
		}
		DFS(new Info(r, c));
		System.out.println(result);
	}

	static private void DFS(Info currentInfo) {
		// x, y좌표의 값을 1로 변경. 청소가 되지 않은 상태였다면 청소를 한 칸이므로 result++
		if (setCheck(currentInfo)) {
			result++;
		}

		boolean flag = false;
		for (int i = 0; i < 4; i++) {
			Info nextValue = new Info(currentInfo.getX() + moveX[i], currentInfo.getY() + moveY[i]);

			// 청소되지 않은 구역이 하나라도 있는 경우 flag = true
			if (validateValue(nextValue) == 0) {
				flag = true;
				break;
			}
		}

		// 주변에 빈 청소 구역이 있는 경우. 반시계 방향으로 회전 후 빈칸인 경우 한칸 전진 후 DFS.
		if (flag) {
			turn();
			Info nextValue = new Info(currentInfo.getX() + moveX[d], currentInfo.getY() + moveY[d]);

			if (validateValue(nextValue) == 0) {
				DFS(nextValue);
			} else {
				// 빈칸이 아니라면 다시 재귀
				DFS(currentInfo);
			}
		} else {
			// 빈 청소 구역이 없는 경우, 후진하고 DFS.
			int backDirection = back();
			Info nextValue = new Info(currentInfo.getX() + moveX[backDirection], currentInfo.getY() + moveY[backDirection]);

			if (validateValue(nextValue) != -1) {
				DFS(nextValue);
			}
		}
	}

	private static class Info {
		private final int x;
		private final int y;

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

	private static int validateValue(Info info) {
		int x = info.getX();
		int y = info.getY();

		if (y > 0 && y < M - 1 && x > 0 && x < N - 1) {
			if (map[x][y] != 1) {
				return map[x][y];
			}
		}
		return -1;
	}

	private static boolean setCheck(Info info) {
		int x = info.getX();
		int y = info.getY();

		if (map[x][y] == 0) {
			map[x][y] = 2;
			return true;
		}
		return false;
	}

	private static void turn() {
		if (--d == -1) d = 3;
	}

	private static int back() {
		if (d <= 1) return d + 2;
		return d - 2;
	}
}
```

## 회고
처음에 내부의 1을 벽이라고 생각하지 않고, 이미 청소된 구역이라고 생각해서 많이 헤맸습니다. 역시 문제를 잘 읽고 풀어야 할 것 같습니다. 그럼에도 먼저 방향성과 풀이 방법을 정하고 푸는 것에 많이 익숙해진 것 같아 뿌듯합니다...!!
