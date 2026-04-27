---
title: 백준 3085. 사탕 게임 문제풀이 자바 JAVA
summary: 백준 3085번 사탕 게임 풀이.
category: algorithm
tags: []
date: '2024-03-06'
visibility: published
---
![|20%](/posts/baekjoon-3085-candy-game/9.png)

## 문제 설명
### 문제

상근이는 어렸을 적에 "봄보니 (Bomboni)" 게임을 즐겨했다.

가장 처음에 N×N크기에 사탕을 채워 놓는다. 사탕의 색은 모두 같지 않을 수도 있다. 상근이는 사탕의 색이 다른 인접한 두 칸을 고른다. 그 다음 고른 칸에 들어있는 사탕을 서로 교환한다. 이제, 모두 같은 색으로 이루어져 있는 가장 긴 연속 부분(행 또는 열)을 고른 다음 그 사탕을 모두 먹는다.
사탕이 채워진 상태가 주어졌을 때, 상근이가 먹을 수 있는 사탕의 최대 개수를 구하는 프로그램을 작성하시오.

### 입력

첫째 줄에 보드의 크기 N이 주어진다. (3 ≤ N ≤ 50)

다음 N개 줄에는 보드에 채워져 있는 사탕의 색상이 주어진다. 빨간색은 C, 파란색은 P, 초록색은 Z, 노란색은 Y로 주어진다.
사탕의 색이 다른 인접한 두 칸이 존재하는 입력만 주어진다.

### 출력

첫째 줄에 상근이가 먹을 수 있는 사탕의 최대 개수를 출력한다.

### 예제

![](/posts/baekjoon-3085-candy-game/스크린샷 2024-03-06 오후 8.50.43.png)

## 문제 풀이
### 문제 분석

보드를 탐색하며 연속된 색이 가장 많은 경우를 찾습니다. 색이 다른 사탕끼리 위치를 **한 번** 교환할 수 있습니다. 예제를 보았을 때, 교환하지 않아도 되는것으로 보입니다.

![](/posts/baekjoon-3085-candy-game/스크린샷 2024-03-06 오후 8.47.39.png)

예제 2번을 그림으로 표현하였습니다. 먼저 모든 X, Y축에 대한 연속된 수를 구하고 최댓값을 저장합니다.

이 경우에는 N과 같은 값인 4가 도출되었기 때문에 더 이상 측정할 필요는 없지만, 다른 답이 있다고 가정하고 계속하겠습니다.

![](/posts/baekjoon-3085-candy-game/스크린샷 2024-03-06 오후 8.49.16.png)

(0,0)부터 (N - 1, N -1)까지 완전탐색하며 (i ,j)를 기준으로 (i + 1, j), (i, j + 1)의 값을 비교하고 색이 다르다면 교환 후 영향을 끼친 행과 열만 재탐색합니다. 그림에서 (2, 2)와 (3, 2)요소를 교환하였을때, 영향을 끼친 3개의 행, 열을 탐색하고 현재 측정된 최댓값보다 크다면 저장합니다.

<탐색을 종료하는 경우>

앞서 설명한 것처럼 최댓값이 N과 같다면 나올 수 있는 가장 큰 값이므로 탐색을 종료할 수 있습니다.

#### 정리

- 교환하지 않았을 때 연속된 최댓값 탐색
- 색이 다른 요소끼리 교환 후 변경된 행, 열을 재탐색
- 최댓값이 N과 같다면 탐색 조기 종료

### 입력 받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
N = Integer.parseInt(br.readLine());

board = new char[N][N];

for (int i = 0; i < N; i++) {
    String str = br.readLine();
    for (int j = 0; j < N; j++) {
        char c = str.charAt(j);
        board[i][j] = c;
    }
}
```

### 풀이 코드

```java
import java.io.*;

public class Main {

	static Character currentChar = null;
	static int cnt = 0;
	static int max = 0;
	static boolean flag = false;
	static int N;
	static char[][] board;

	public static void main(String[] args) throws IOException{
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		N = Integer.parseInt(br.readLine());

		board = new char[N][N];

		for (int i = 0; i < N; i++) {
			String str = br.readLine();
			for (int j = 0; j < N; j++) {
				char c = str.charAt(j);
				board[i][j] = c;
			}
		}

		// 최초 상태 최댓값
		for (int i = 0; i < N; i++) {
			scan(0, i);
			scan(1, i);
		}

		loop:
		for (int i = 0; i < N; i++) {
			for (int j = 0; j < N; j++) {
				// 수평 교환
				if (j + 1 < N && board[i][j] != board[i][j + 1]) {
					swap(i, j, i, j + 1);
					scan(0, i);
					scan(1, j);
					scan(1, j + 1);
					swap(i, j, i, j + 1);
				}

				// 수직 교환
				if (i + 1 < N && board[i][j] != board[i + 1][j]) {
					swap(i, j, i + 1, j);
					scan(1, j);
					scan(0, i);
					scan(0, i + 1);
					swap(i, j, i + 1, j);
				}

				if (flag) break loop;
			}
		}

		System.out.println(max);
	}

	private static void swap(int x, int y, int tx, int ty) {
		char temp = board[x][y];
		board[x][y] = board[tx][ty];
		board[tx][ty] = temp;
	}

	static private boolean isCorrect(char target) {
		return currentChar == null || currentChar == target;
	}

	static private void reset() {
		cnt = 0;
		currentChar = null;
	}

	static private void scan(int type, int num) {
		for (int i = 0; i < N; i++) {
			if (flag) return;

			char target;
			if (type == 0) {
				target = board[num][i];
			} else {
				target = board[i][num];
			}

			boolean result = isCorrect(target);
			if (!result) {
				updateMax();
			}

			currentChar = target;
			cnt++;
		}

		updateMax();
	}

	private static void updateMax() {
		if (cnt == N) {
			flag = true;
		}
		max = Math.max(cnt, max);
		reset();
	}
}
```

## 회고
단순한 완전탐색 문제지만 갈피를 잘못잡아서 헤맸다. 함수들의 역할을 확실히 해서 단일책임원칙을 지키는게 코드 가독성 측면에서 좋아보인다.
