---
title: '백준 2644. 촌수계산 문제풀이 JAVA'
summary: '백준 2644번 촌수계산 풀이.'
category: algorithm-solve
tags: []
date: '2023-12-06'
visibility: published
---
![](/posts/baekjoon-2644-kinship/9.png)

## 문제 설명
### 문제

우리 나라는 가족 혹은 친척들 사이의 관계를 촌수라는 단위로 표현하는 독특한 문화를 가지고 있다. 이러한 촌수는 다음과 같은 방식으로 계산된다. 기본적으로 부모와 자식 사이를 1촌으로 정의하고 이로부터 사람들 간의 촌수를 계산한다. 예를 들면 나와 아버지, 아버지와 할아버지는 각각 1촌으로 나와 할아버지는 2촌이 되고, 아버지 형제들과 할아버지는 1촌, 나와 아버지 형제들과는 3촌이 된다.

여러 사람들에 대한 부모 자식들 간의 관계가 주어졌을 때, 주어진 두 사람의 촌수를 계산하는 프로그램을 작성하시오.

### 입력

사람들은 1, 2, 3, …, n (1 ≤ n ≤ 100)의 연속된 번호로 각각 표시된다. 입력 파일의 첫째 줄에는 전체 사람의 수 n이 주어지고, 둘째 줄에는 촌수를 계산해야 하는 서로 다른 두 사람의 번호가 주어진다. 그리고 셋째 줄에는 부모 자식들 간의 관계의 개수 m이 주어진다. 넷째 줄부터는 부모 자식간의 관계를 나타내는 두 번호 x,y가 각 줄에 나온다. 이때 앞에 나오는 번호 x는 뒤에 나오는 정수 y의 부모 번호를 나타낸다.

각 사람의 부모는 최대 한 명만 주어진다.

### 출력

입력에서 요구한 두 사람의 촌수를 나타내는 정수를 출력한다. 어떤 경우에는 두 사람의 친척 관계가 전혀 없어 촌수를 계산할 수 없을 때가 있다. 이때에는 -1을 출력해야 한다.

### 예제

![](/posts/baekjoon-2644-kinship/img.png)

## 문제 풀이
### 문제 분석

먼저 촌수에 대해 이해해보겠습니다. 아래 그림은 임의의 가족 트리입니다.

![가족 트리](/posts/baekjoon-2644-kinship/img.jpg)

여기에서 10번을 기준으로 촌수를 나타내면 다음과 같습니다.

![](/posts/baekjoon-2644-kinship/img_1.jpg)

이제 10과 6의 촌수를 계산한다고 가정해 보겠습니다.

![](/posts/baekjoon-2644-kinship/img_2.jpg)

10의 index는 2, 6의 index는 1로 둘의 합은 3이 됩니다.

이와 같이 촌수 관계를 분석해 보았을 때, 타깃의 공통 부모로부터의 각각의 index(깊이)를 더하면 촌수를 구할 수 있습니다.

10과 8의 촌수를 구하는 경우는 다음과 같습니다.

![](/posts/baekjoon-2644-kinship/img_3.jpg)

10의 index는 3 8의 index는 2이므로 촌수는 5가 됩니다.

이것을 구현하기 위해 먼저 타겟의 가장 상위 부모(1)까지의 배열을 구합니다. 재귀로 부모를 탐색하며 리스트에 추가합니다.

```java
private static void getParents(int current) {
    tempList.add(current);

    for (int i = 1; i <= N; i++) {
        if (graph[i][current] == 1) {
            getParents(i);
        }
    }
}
```

그리고 두 배열의 가장 처음 공통된 값을 찾습니다. 만약 공통된 값이 존재하지 않는다면 친척관계가 아니기 때문에 -1을 출력합니다.

공통분모를 a이라 한다면, target1 배열의 a의 위치와 target2 배열의 a의 위치를 더해 촌수를 구할 수 있습니다.

```java
getParents(t1);
List<Integer> t1Arr = new ArrayList<>(tempList);
tempList.clear();

getParents(t2);
List<Integer> t2Arr = new ArrayList<>(tempList);

for (int i = 0; i < t1Arr.size(); i++) {
    Integer targetIndex = t1Arr.get(i);

    int index = t2Arr.indexOf(targetIndex);
    if (index >= 0) {
        // System.out.println("같은 요소 : " + targetIndex + " | t1 index : " + i + " | t2 index : " + index);
        // i는 t1의 공통 부모로 부터 index
        // index는 t2의 공통 부모로 부터 index
        result = i + index;
        break;
    }
}
```

이후 result를 출력합니다.

### 입력받기

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
N = Integer.parseInt(br.readLine());

graph = new int[N + 1][N + 1];

StringTokenizer st = new StringTokenizer(br.readLine(), " ");

t1 = Integer.parseInt(st.nextToken());
t2 = Integer.parseInt(st.nextToken());

int m = Integer.parseInt(br.readLine());

for (int i = 0; i < m; i++) {
    StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
    int a = Integer.parseInt(temp.nextToken());
    int b = Integer.parseInt(temp.nextToken());

    // 방향 그래프
    graph[a][b] = 1;
}
```

부모와 자식의 방향이 정해져 있으므로 방향 그래프에 해당합니다.

### 풀이 코드

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N, t1, t2;
	static int[][] graph;
	static List<Integer> tempList = new ArrayList<>();

	public static void main(String[] args) throws IOException {
		int result = -1;

		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		N = Integer.parseInt(br.readLine());

		graph = new int[N + 1][N + 1];

		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		t1 = Integer.parseInt(st.nextToken());
		t2 = Integer.parseInt(st.nextToken());

		int m = Integer.parseInt(br.readLine());

		for (int i = 0; i < m; i++) {
			StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
			int a = Integer.parseInt(temp.nextToken());
			int b = Integer.parseInt(temp.nextToken());

			// 방향 그래프
			graph[a][b] = 1;
		}

		getParents(t1);
		List<Integer> t1Arr = new ArrayList<>(tempList);
		tempList.clear();

		getParents(t2);
		List<Integer> t2Arr = new ArrayList<>(tempList);

		for (int i = 0; i < t1Arr.size(); i++) {
			Integer targetIndex = t1Arr.get(i);

			int index = t2Arr.indexOf(targetIndex);
			if (index >= 0) {
				// System.out.println("같은 요소 : " + targetIndex + " | t1 index : " + i + " | t2 index : " + index);
				// i는 t1의 공통 부모로 부터 index
				// index는 t2의 공통 부모로 부터 index
				result = i + index;
				break;
			}
		}
		System.out.print(result);
	}

	private static void getParents(int current) {
		tempList.add(current);

		for (int i = 1; i <= N; i++) {
			if (graph[i][current] == 1) {
				getParents(i);
			}
		}
	}
}
```

일반적으로 배열 두 개를 같은 방법으로 구하고 두 개의 배열을 이중으로 돌며 공통 부모를 탐색합니다.

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class Main {
	static int N, t1, t2;
	static int[][] graph;
	static List<Integer> tempList = new ArrayList<>();
	static List<Integer> t1Arr;

	static int temp = -1;

	static boolean flag = false;

	public static void main(String[] args) throws IOException {
		int result = -1;

		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		N = Integer.parseInt(br.readLine());

		graph = new int[N + 1][N + 1];

		StringTokenizer st = new StringTokenizer(br.readLine(), " ");

		t1 = Integer.parseInt(st.nextToken());
		t2 = Integer.parseInt(st.nextToken());

		int m = Integer.parseInt(br.readLine());

		for (int i = 0; i < m; i++) {
			StringTokenizer temp = new StringTokenizer(br.readLine(), " ");
			int a = Integer.parseInt(temp.nextToken());
			int b = Integer.parseInt(temp.nextToken());

			// 방향 그래프
			graph[a][b] = 1;
		}

		getParents(t1);
		t1Arr = new ArrayList<>(tempList);
		flag = true;
		tempList.clear();

		getParents(t2);
		List<Integer> t2Arr = new ArrayList<>(tempList);

		if (!(temp == -1)) {
			result = t1Arr.indexOf(temp) + t2Arr.size();
		}

		System.out.print(result);
	}

	private static void getParents(int current) {
		if (flag) {
			if (t1Arr.contains(current)) {
				temp = current;
				return;
			}
		}

		tempList.add(current);

		for (int i = 1; i <= N; i++) {
			if (graph[i][current] == 1) {
				getParents(i);
				break;
			}
		}
	}
}
```

첫 번째 타겟을 구한 이후, 두번째 재귀를 돌 때 첫번째 재귀의 부모가 포함되었는지 확인 후 가장 가까운 공통 부모를 만나면 종료하도록 변경하였습니다. 이후 이중으로 탐색하는 것이 아닌, temp로 받은 공통분모에 대해 indexOf 함수로 index를 구할 수 있었습니다.

## 회고
처음 문제를 접하고 어떻게 풀지 고민이 많았습니다. DFS를 포함하여 여러 풀이가 있는 문제 같습니다. 내일 DFS로 풀고 올려야징
