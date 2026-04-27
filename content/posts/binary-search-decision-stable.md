---
title: '이분탐색 결정 알고리즘 개념정리 및 예제 문제풀이 <마구간 정하기>'
summary: '결정 알고리즘과 이분탐색 — 마구간 정하기 예제 풀이.'
category: algorithm
tags: []
date: '2023-12-14'
visibility: published
---
## 결정 알고리즘

- 이분 탐색을 기반으로 하여 이분탐색의 장점을 갖고 있습니다. 각 단계에서 탐색의 범위를 반으로 줄이기 때문에 빠른 속도를 보입니다. 시간 복잡도는 O(log n)입니다.

## 특징

- 정렬된 데이터에서만 사용할 수 있습니다. 때문에 데이터를 정렬하는 추가적인 비용이 발생할 수 있으며, 정렬된 상태를 유지해야 합니다.
- 위의 특성때문에 주로 정적인 데이터에 사용됩니다. 정적인 데이터가 아닌 동적인 데이터에 대해 탐색한다면, 매번 데이터를 재정렬 해야 합니다.
- 분할 정복(divide and conquer) 전략을 따릅니다. 주어진 하나의 문제를 작은 여러 문제로 나누어 해결하고, 그 결과를 합쳐 전체 문제를 해결합니다.

## 예제 문제

### 설명

N개의 마구간이 수직선상에 있습니다. 각 마구간은 x1, x2, x3, ......, xN의 좌표를 가지며, 마구간간에 좌표가 중복되는 일은 없습니다.

현수는 C마리의 말을 가지고 있는데, 이 말들은 서로 가까이 있는 것을 좋아하지 않습니다. 각 마구간에는 한 마리의 말만 넣을 수 있고,
가장 가까운 두 말의 거리가 최대가 되게 말을 마구간에 배치하고 싶습니다.
C마리의 말을 N개의 마구간에 배치했을 때 가장 가까운 두 말의 거리가 최대가 되는 그 최댓값을 출력하는 프로그램을 작성하세요.

입력 첫 줄에 자연수 N(3 <=N <=200,000)과 C(2 <=C <=N)이 공백을 사이에 두고 주어집니다.

둘째 줄에 마구간의 좌표 xi(0<=xi<=1,000,000,000)가 차례로 주어집니다.

###
출력

첫 줄에 가장 가까운 두 말의 최대 거리를 출력하세요.

### 예제

![](/posts/binary-search-decision-stable/img.png)

## 문제 분석

마구간에 주어진 말을 모두 배치하면서, 말끼리의 거리가 가장 최대가 되는 값을 구하는 문제입니다.

마구간의 값을 보았을때, 마구간 간의 최솟값은 1, 최댓값은 9가 될 수 있습니다.

정답은 1과 9 사이에 반드시 존재하는데, 이런 경우에서 결정 알고리즘을 사용할 수 있습니다.

### 결정 알고리즘 적용

![](/posts/binary-search-decision-stable/img_1.png)

이 Loop는 lt < rt를 만족한다면 반복합니다.

위 그림처럼 lt(최솟값)를 1, rt(최댓값)를 9로 설정합니다. target 값은 lt와 rt를 더한 값을 2로 나눈 값입니다.

이제 마굿간 사이의 거리가 target 값보다 같거나 크게 하는 경우가 존재하는지 탐색합니다.

![](/posts/binary-search-decision-stable/img_2.png)

target이 5일 때 배치할 수 있는 말은 2가지뿐입니다. 이렇게 놓을 수 있는 개수를 만족하지 못하는 경우는 target의 값이 크기 때문이므로 rt를 target - 1로 설정하고 위 과정을 반복합니다.

![](/posts/binary-search-decision-stable/img_3.png)

이제 새로운 target은 2입니다. 이 경우에서 다시 한번 탐색해 보겠습니다.

![](/posts/binary-search-decision-stable/img_4.png)

target이 2일때 모든 말을 배치할 수 있습니다. 이 값을 결괏값에 저장합니다. 하지만 더 높은 target값이 존재할 수 있으므로, lt의 값을 target + 1로 설정하고 반복합니다.

![](/posts/binary-search-decision-stable/img_5.png)

target 값은 3이 되었습니다. 다시 이 값이 만족하는지 확인합니다.

![](/posts/binary-search-decision-stable/img_6.png)

3 또한 만족함을 확인하였으므로 결과 값에 덮어씌운 뒤, lt를 target + 1 값으로 변경합니다.

![](/posts/binary-search-decision-stable/img_7.png)

lt < rt 조건을 만족하지 않으므로 Loop를 종료합니다.

마지막으로 저장된 값 3이 정답이 됩니다.

## 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.StringTokenizer;

// 마구간 정하기
public class Main {
	public static void main(String[] args) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		int N = Integer.parseInt(st.nextToken());
		int C = Integer.parseInt(st.nextToken());

		int[] arr = new int[N];

		st = new StringTokenizer(br.readLine(), " ");

		for (int i = 0; i < N; i++) {
			arr[i] = Integer.parseInt(st.nextToken());
		}

		Arrays.sort(arr);

		int rt = arr[N - 1];
		int lt = 1;
		int target;
		int result = 0;

		while (lt <= rt) {
			int cnt = 1;

			target = (lt + rt) / 2;
			int currentValue = arr[0];

			for (int j = 1; j < N; j++) {
				if (cnt == C) {
					break;
				}

				if (currentValue + target <= arr[j]) {
					cnt++;
					currentValue = arr[j];
				}
			}

			// target 을 줄여야함
			if (cnt < C) {
				rt = target - 1;
			} else {
				result = target;
				lt = target + 1;
			}
		}

		System.out.print(result);
	}
}
```

탐색시 C번을 초과해서 탐색하는 것은 의미가 없기 때문에, cnt가 C와 같다면 루프를 빠져나오도록 하였습니다.

## 회고

일반적인 선형 탐색에 비해 월등히 빠르기 때문에, 시간 복잡도가 낮은 알고리즘을 요구하는 문제를 위해 꼭 숙지하고 있어야 할 것 같습니다. 구현이 어렵지는 않지만, 루프가 종료되는 타이밍을 주의해야겠습니다.

## 레퍼런스

문제 출저 : 자바 알고리즘 문제풀이 코딩테스트 대비

[https://www.inflearn.com/course/자바-알고리즘-문제풀이-코테대비/dashboard](https://www.inflearn.com/course/자바-알고리즘-문제풀이-코테대비/dashboard)
