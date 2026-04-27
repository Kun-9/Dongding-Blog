---
title: '백준 9205. 맥주 마시면서 걸어가기 문제풀이 자바 JAVA'
summary: '백준 9205번 맥주 마시면서 걸어가기 풀이.'
category: algorithm
tags: []
date: '2023-12-07'
visibility: published
---
![](/posts/baekjoon-9205-beer-walk/11.png)

## 문제 설명
### 문제

송도에 사는 상근이와 친구들은 송도에서 열리는 펜타포트 락 페스티벌에 가려고 한다. 올해는 맥주를 마시면서 걸어가기로 했다. 출발은 상근이네 집에서 하고, 맥주 한 박스를 들고 출발한다. 맥주 한 박스에는 맥주가 20개 들어있다. 목이 마르면 안되기 때문에 50미터에 한 병씩 마시려고 한다. 즉, 50미터를 가려면 그 직전에 맥주 한 병을 마셔야 한다.

상근이의 집에서 페스티벌이 열리는 곳은 매우 먼 거리이다. 따라서, 맥주를 더 구매해야 할 수도 있다. 미리 인터넷으로 조사를 해보니 다행히도 맥주를 파는 편의점이 있다. 편의점에 들렸을 때, 빈 병은 버리고 새 맥주 병을 살 수 있다. 하지만, 박스에 들어있는 맥주는 20병을 넘을 수 없다. 편의점을 나선 직후에도 50미터를 가기 전에 맥주 한 병을 마셔야 한다.

편의점, 상근이네 집, 펜타포트 락 페스티벌의 좌표가 주어진다. 상근이와 친구들이 행복하게 페스티벌에 도착할 수 있는지 구하는 프로그램을 작성하시오.

### 입력

첫째 줄에 테스트 케이스의 개수 t가 주어진다. (t ≤ 50)

각 테스트 케이스의 첫째 줄에는 맥주를 파는 편의점의 개수 n이 주어진다. (0 ≤ n ≤ 100).

다음 n+2개 줄에는 상근이네 집, 편의점, 펜타포트 락 페스티벌 좌표가 주어진다. 각 좌표는 두 정수 x와 y로 이루어져 있다. (두 값 모두 미터, -32768 ≤ x, y ≤ 32767)

송도는 직사각형 모양으로 생긴 도시이다. 두 좌표 사이의 거리는 x 좌표의 차이 + y 좌표의 차이 이다. (맨해튼 거리)

### 출력

각 테스트 케이스에 대해서 상근이와 친구들이 행복하게 페스티벌에 갈 수 있으면 "happy", 중간에 맥주가 바닥나서 더 이동할 수 없으면 "sad"를 출력한다.

### 예제

![](/posts/baekjoon-9205-beer-walk/img.png)

## 문제 풀이
### 문제 분석

단순하게 모든 좌표를 노드로 생각하고, 탐색시 1000m(맥주 20개) 이하인 노드를 탐색하며 종점 노드에 도달할 수 있는지 여부를 출력하면 되는 문제로 접근하였습니다.

```java
1
2
0 0
200 600
800 300
1000 1000
```

인 입력이 있을 때의 그래프를 나타내면 다음과 같습니다.

![](/posts/baekjoon-9205-beer-walk/img_1.png)

그림에서는 경우의 수를 위해 화살표로 표현하였지만, 양방향 모두 이동이 가능한 무방향 그래프입니다.

이것을 트리로 나타내면 다음과 같습니다.

![](/posts/baekjoon-9205-beer-walk/img_2.png)

index에 관계 없이 종점 노드를 찾을 수 있는지 여부만 출력하면 되기 때문에 DFS탐색을 사용합니다.

**<그 외 생각해 볼만한 요소>**

**1\. 거리가 나누어 떨어지지 않는 경우는 생각해야 할까?**

![](/posts/baekjoon-9205-beer-walk/img_3.png)

문제에서 편의점을 출발할 때 맥주를 바로 마셔야 한다고 명시되어 있습니다. 때문에 편의점을 출발하는 순간은 무조건 20병인 상태로 출발합니다. 그림에서 처럼 초과한 거리 또한 계산하지 않습니다.

**2\. 탐색시 목표보다 멀어진다면 가지 말아야 할까?**

![](/posts/baekjoon-9205-beer-walk/img_4.png)

위 그림처럼 목적지에서 멀어지더라도 돌아서 가는 경우도 있기 때문에, 현재 노드보다 목표까지의 거리가 멀어지더라도 계속 탐색하여야 합니다.

#### 정리

\- 입력시 모든 노드(좌표)를 배열에 저장한다. 이때 첫 노드는 시작노드, 마지막 노드는 목표 노드이다.

\- 시작 노드를 기준으로 탐색을 시작한다. 해당 포스트에서는 DFS 탐색을 수행하였지만 BFS 탐색 또한 가능해 보인다.

\- 답을 찾았을 때 더 이상 탐색하지 않기 위해 boolean flag 가 true일 때 return 하도록 한다.

\- 목표 지점에 도달하면 flag의 값을 true로 하여 재귀를 탈출하고, flag의 값을 결과 리스트에 저장한다.

\- 모든 케이스가 끝나고 flag의 값을 기반으로 답을 출력한다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
List<Boolean> result = new ArrayList<>();

int t = Integer.parseInt(br.readLine());

for (int i = 0; i < t; i++) {
    nodes = new ArrayList<>();
    check = new HashSet<>();
    flag = false;

    int n = Integer.parseInt(br.readLine());

    for (int j = 0; j < n + 2; j++) {
        StringTokenizer st = new StringTokenizer(br.readLine(), " ");
        int tempX = Integer.parseInt(st.nextToken());
        int tempY = Integer.parseInt(st.nextToken());

        nodes.add(new Info(tempX, tempY));
    }
    goal = nodes.get(nodes.size() - 1);

    DFS(nodes.get(0));
    result.add(flag);

    nodes.clear();
}
```

케이스가 여러 번 반복되기 때문에 변수 초기화에 유의하자.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static Info goal;
	static ArrayList<Info> nodes;
	static HashSet<Info> check;

	public static void main(String[] args) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		List<Boolean> result = new ArrayList<>();

		int t = Integer.parseInt(br.readLine());

		for (int i = 0; i < t; i++) {
			nodes = new ArrayList<>();
			check = new HashSet<>();
			flag = false;

			int n = Integer.parseInt(br.readLine());

			for (int j = 0; j < n + 2; j++) {
				StringTokenizer st = new StringTokenizer(br.readLine(), " ");
				int tempX = Integer.parseInt(st.nextToken());
				int tempY = Integer.parseInt(st.nextToken());

				nodes.add(new Info(tempX, tempY));
			}
			goal = nodes.get(nodes.size() - 1);

			DFS(nodes.get(0));
			result.add(flag);

			nodes.clear();
		}

		for (Boolean r : result) {
			System.out.println(r ? "happy" : "sad");
		}
	}

	static boolean flag;

	private static void DFS(Info currentNode) {
		if (flag) return;
		if (check.contains(currentNode)) return;
		if (currentNode.equals(goal)) {
			flag = true;
			return;
		}
		check.add(currentNode);

		int x = currentNode.getX();
		int y = currentNode.getY();

		for (Info toGo : nodes) {
			// 현재 거리보다 목표에서 더 멀어지는 경우는 가지 말아야 할까?
			// 돌아서 가는 경우도 있지 않을까?

			if (toGo.equals(currentNode)) continue;

			int toX = toGo.getX();
			int toY = toGo.getY();

			int length = Math.abs(toX - x) + Math.abs(toY - y);

			if (length <= 1000) {
				DFS(toGo);
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
여러모로 생각해 볼거리가 많은 문제였습니다. 알고리즘 문제를 풀수록, 문제를 분석하고 방향성을 잡아놓는 것이 중요하다는 것을 느낍니다.
