---
title: '백준 2178. 미로탐색 문제풀이 JAVA'
summary: '백준 2178번 미로탐색 문제를 BFS로 푼다.'
category: algorithm
tags: []
date: '2023-12-05'
visibility: published
---
![](/posts/baekjoon-2178-maze/10-2.png)

## 문제 설명
### 문제

N×M크기의 배열로 표현되는 미로가 있다.

1 0 1 1 1 1
1 0 1 0 1 0
1 0 1 0 1 1
1 1 1 0 1 1

미로에서 1은 이동할 수 있는 칸을 나타내고, 0은 이동할 수 없는 칸을 나타낸다. 이러한 미로가 주어졌을 때, (1, 1)에서 출발하여 (N, M)의 위치로 이동할 때 지나야 하는 최소의 칸 수를 구하는 프로그램을 작성하시오. 한 칸에서 다른 칸으로 이동할 때, 서로 인접한 칸으로만 이동할 수 있다.

위의 예에서는 15칸을 지나야 (N, M)의 위치로 이동할 수 있다. 칸을 셀 때에는 시작 위치와 도착 위치도 포함한다.

### 입력

첫째 줄에 두 정수 N, M(2 ≤ N, M ≤ 100)이 주어진다. 다음 N개의 줄에는 M개의 정수로 미로가 주어진다. 각각의 수들은 붙어서 입력으로 주어진다.

### 출력

첫째 줄에 지나야 하는 최소의 칸 수를 출력한다. 항상 도착위치로 이동할 수 있는 경우만 입력으로 주어진다.

### 예제

![](/posts/baekjoon-2178-maze/img.png)

## 문제 풀이
### 문제 분석

미로를 탐색하며 최소 칸 수를 구하는 문제이기 때문에, BFS를 사용하였습니다. BFS는 한 번의 반복에서 같은 차수를 비교하기 때문에, 가장 먼저 종점이 발견되는 시점에서 해당 차수의 값을 리턴하도록 하였습니다.

미로에서 한 좌표는 상, 하, 좌, 우 4방향으로 이동할 수 있습니다.

![](/posts/baekjoon-2178-maze/img.jpg)

따라서 다음과 같이 miro[i + 1][j], miro[i][j+1], miro[i - 1][j], miro[i][j - 1] 총 4가지 경우의 수를 모두 고려해야 합니다.

이때 고려해야 할 사항은 다음과 같습니다.

- 이미 지나간 길은 다시 가지 않을 것
- miro의 좌표값이 1일 것
- i의 값이 0보다 크고 N보다 작을 것.
- j의 값이 0보다 크고 M보다 작을 것.

![초록색 1은 지나간 길을 표시한 것](/posts/baekjoon-2178-maze/img_1.jpg)

이미 지나간 길을 다시 가지 않도록 하기 위해 miro와 동일한 크기의 check배열을 만들고 방문 시 1로 표시하였습니다.

```
private static void validOffer(int i, int j, Queue<int[]> queue) {
    // 좌표가 허용 범위에 포함 되는지 검증
    if (i >= 0 && j >= 0 && i < N && j < M) {
        // 해당 좌표의 값이 1인지, 방문 한적 없는지 확인
        if (miro[i][j] == 1 && check[i][j] == 0) {
            queue.offer(new int[]{i, j});
            check[i][j] = 1;
        }
    }
}
```

validOffer라는 함수를 만들어 해당 조건들을 만족해야만 큐에 넣도록 작성하였습니다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

StringTokenizer st = new StringTokenizer(br.readLine(), " ");

N = Integer.parseInt(st.nextToken());
M = Integer.parseInt(st.nextToken());

miro = new int[N][M];
check = new int[N][M];

for (int i = 0; i < N; i++) {
    String str = br.readLine();

    for (int j = 0; j < M; j++) {
        int digit = Character.getNumericValue(str.charAt(j));
        miro[i][j] = digit;
    }
}
```

공백으로 구분되지 않고 M개로 이루어진 N개의 배열이 입력됩니다. 때문에 문자열을 앞자리부터 charAt 함수를 이용하여 파싱해 주었습니다.

### 풀이 코드

```
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

// 미로 탐색 2178
public class Main {
    static int N, M;
    static int[][] miro, check;

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

        StringTokenizer st = new StringTokenizer(br.readLine(), " ");

        N = Integer.parseInt(st.nextToken());
        M = Integer.parseInt(st.nextToken());

        miro = new int[N][M];
        check = new int[N][M];

        for (int i = 0; i < N; i++) {
            String str = br.readLine();

            for (int j = 0; j < M; j++) {
                int digit = Character.getNumericValue(str.charAt(j));
                miro[i][j] = digit;
            }
        }

        System.out.println(BFS());
    }

    private static int BFS() {
        int i, j;
        Queue<int[]> queue = new LinkedList<>();
        int index = 0;
        queue.offer(new int[]{0, 0});

        while (!queue.isEmpty()) {
            int len = queue.size();

            for (int k = 0; k < len; k++) {
                int[] poll = queue.poll();

                i = poll[0]; j = poll[1];

                if (i == N - 1 && j == M - 1) return ++index;

                validOffer(i + 1, j, queue);
                validOffer(i, j + 1, queue);
                validOffer(i - 1, j, queue);
                validOffer(i, j - 1, queue);
            }
            index++;
        }
        return 0;
    }

    private static void validOffer(int i, int j, Queue<int[]> queue) {
        // 좌표가 허용 범위에 포함 되는지 검증
        if (i >= 0 && j >= 0 && i < N && j < M) {
            // 해당 좌표의 값이 1인지, 방문 한적 없는지 확인
            if (miro[i][j] == 1 && check[i][j] == 0) {
                queue.offer(new int[]{i, j});
                check[i][j] = 1;
            }
        }
    }
}
```

## 회고
BFS로 바로 접근한다면 어렵지 않은 문제였던 것 같습니다. 어떤 알고리즘을 활용해야 하는지 문제를 분석하고 푸는 것이 무작정 접근해서 다시 푸는 것보다 백번 나은 것이라는 것을 느꼈습니다.
