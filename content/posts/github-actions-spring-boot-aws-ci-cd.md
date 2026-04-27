---
title: 'GitHub-Actions를 활용한 Spring Boot AWS CI/CD 프로세스 구현'
summary: 'GitHub Actions로 Spring Boot 앱을 AWS EC2에 자동 배포하는 CI/CD 파이프라인을 구축한다.'
category: system
tags:
  - cd
  - java
  - ci
  - server
  - aws
  - ec2
  - devops
  - spring-boot
  - ci-cd
  - github-actions
date: '2023-12-01'
visibility: published
---
> [!INFO] 개발 환경
> Spring Boot, Docker, Gradle, Java 11, Github-Actions, AWS EC2.

먼저 CI/CD에 대해서 간단하게 알아보겠습니다.

## CI/CD란?
### CI (Continuous Integration)

CI는 지속적 통합의 약자로, 개발자들이 코드를 중앙 저장소에 통합하는 작업을 지속적으로 자동화하는 프로세스입니다. 이는 여러 개발자가 동시에 작업하고 있는 경우 코드 충돌이나 호환성 문제를 최소화하고, 소프트웨어를 더 빠르게 테스트 및 통합함으로써 품질을 유지하도록 돕습니다.

주요 특징

- 자동화된 빌드 및 테스트 프로세스
- 코드 변경 사항의 지속적인 통합
- 초기 오류 및 호환성 문제 식별

### CD (Continuous Delivery / Continuous Deployment)

CD는 코드 변경 사항을 실제 서비스 환경에 안전하게 전달하는 과정을 지속적으로 자동화하는 것을 의미합니다.

#### CD의 두가지 의미

#### Continuous Delivery
- 변경 사항을 테스트 및 스테이징 환경까지 자동으로 전달합니다.
- 실제 프로덕션 환경에 배포되기 전에 인간의 검토나 승인이 필요합니다.
- 지속적인 통합과 테스트로, 언제든 프로덕션 환경에 출시할 수 있는 상태를 유지하는 것. 배포 승인이 필요하다.

**Continuous Deployment**

- 변경 사항이 자동으로 테스트되고 승인된 즉시, 프로덕션 환경에 자동으로 배포합니다.
- Continuous Delivery보다 민첩하게 대응할 수 있지만, 모든 과정이 자동으로 실행되므로 실수로 인한 잘못된 코드배포가 이루어질 수 있다.

이러한 CI/CD 파이프라인은 개발자와 운영팀이 더욱 효율적으로 협력하고 소프트웨어를 안정적으로 제공하는 데 도움을 줍니다.

CI/CD의 주요 특징

- 빠른 피드백과 빠른 배포
- 품질 향상과 버그 조기 발견
- 개발자 및 운영팀 간의 협업 강화

### CI/CD툴 선택

이 프로세스를 구현하기 위해 **Jenkins, Travis CI, GitHub-Actions** 등 CI/CD 기능을 제공하는 여러 툴들이 존재합니다.
각자의 환경이나 필요한 기능에 맞게 알맞은 툴을 선택하고 진행하면 될 것 같습니다.
이 포스트에서는 GitHub-Actions을 사용해서 진행하였습니다.

### GitHub-Actions

GitHub-Actions는 GitHub에서 제공하는 CI/CD를 위한 서비스입니다. GitHub 리포지토리와 밀접하게 연관되어있어, 설정에 용이하고, 저장소 내에서 워크플로우를 정의 및 관리할 수 있다는 장점이 있습니다.

## CI/CD WorkFlow
구현하고자 하는 CI/CD 워크플로우를 그려보았습니다.

![GitHub-Actions CI/CD Workflow](/posts/github-actions-spring-boot-aws-ci-cd/img.png)

## GitHub-Actions YAML파일 작성
GitHub-Actions는 YAML파일 을 사용하여 CI/CD 워크플로우를 정의합니다. 때문에, 가독성이 높고 협업이 용이한 특징이 있습니다.

초기 yml 파일.

> [!WARNING] 아래 파일은 오류가 발생합니다
> 다음 단락 "문제 해결"에서 수정 사항을 정리한다.

```java
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.
# This workflow will build a Java project with Gradle and cache/restore any dependencies to improve the workflow execution time
# For more information see: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-java-with-gradle

name: CI/CD AWS EC2 Docker

on:
  push:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:
    # 기본 설정 및 application.yml 생성
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'

    - name: Build with Gradle
      run: ./gradlew build

    ## 도커 이미지 빌드 후 도커허브에 push하기
    - name: web docker build and push
      run: |
        docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
        docker build -f Dockerfile -t ${{ secrets.DOCKER_REPO }}
        docker push ${{ secrets.DOCKER_REPO }}

    ## 서버에 접속하여 도커 이미지를 pull 받고 실행하기
    - name: executing remote ssh commands using password
      uses: appleboy/ssh-action@v0.1.6
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.EC2_USERNAME }}
        key: ${{ secrets.KEY }}
        port: 22
        script: |
          sudo docker stop prod-server
          sudo docker rm prod-server
          sudo docker image rm ${{ secrets.DOCKER_REPO }}
          sudo docker pull ${{ secrets.DOCKER_REPO }}
          sudo docker run -d -p 8080:8080 ${{ secrets.DOCKER_REPO }}
```

GitHub-Actions에서는 Secret이라는 변수를 안전하게 저장하고 참조할 수 있는 기능을 제공합니다.

여기에 API 토큰, 암호, 인증 키와 같은 민감한 정보를 저장하고, ${{ secrets.변수명 }} 으로 참조할 수 있습니다.

## 문제점
github-action은 정상적으로 실행되었고 ec2 내에서 도커 컨테이너가 실행중인 것을 확인하였습니다.

하지만 외부에서 서버에 접속되지 않는 현상이 발생하였습니다.

포트 문제로 추정하고 80 → 8080 포트포워딩을 하였으나 여전히 접속되지 않아, 컨테이너가 일정 시간 후에 종료되는 문제가 있다는 것을 파악하였습니다. 이후 Docker의 빌드 방식, 컨테이너 생성 옵션등을 바꾸어 보았지만 여전히 해결되지 않았습니다.

### 문제 해결

**기존 파일에 추가한 항목**

```java
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  DATABASE_USERNAME: ${{ secrets.DATABASE_USERNAME }}
  DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
  S3_ACCESS_KEY: ${{ secrets.S3_ACCESS_KEY }}
  S3_SECRET_KEY: ${{ secrets.S3_SECRET_KEY }}

steps:
- name: Checkout repository
  uses: actions/checkout@v2

- name: Set up JDK 11
  uses: actions/setup-java@v2
  with:
    java-version: '11'

- name: Make application.properties
  run: |
    echo "spring.messages.basename=errors" > ./src/main/resources/application.properties
    echo "server.servlet.session.tracking-modes=cookie" >> ./src/main/resources/application.properties
    echo "server.error.whitelabel.enabled=false" >> ./src/main/resources/application.properties
    echo "server.servlet.session.timeout=7500" >> ./src/main/resources/application.properties
    echo "" >> ./src/main/resources/application.properties
    echo "spring.datasource.url=${DATABASE_URL}" >> ./src/main/resources/application.properties
    echo "spring.datasource.username=${DATABASE_USERNAME}" >> ./src/main/resources/application.properties
    echo "spring.datasource.password=${DATABASE_PASSWORD}" >> ./src/main/resources/application.properties
    echo "" >> ./src/main/resources/application.properties
    echo "spring.servlet.multipart.max-file-size=4MB" >> ./src/main/resources/application.properties
    echo "spring.servlet.multipart.max-request-size=20MB" >> ./src/main/resources/application.properties
    echo "" >> ./src/main/resources/application.properties
    echo "# aws 설정" >> ./src/main/resources/application.properties
    echo "cloud.aws.region.static=ap-northeast-2" >> ./src/main/resources/application.properties
    echo "cloud.aws.stack.auto=false" >> ./src/main/resources/application.properties
    echo "s3.AccessKey=${S3_ACCESS_KEY}" >> ./src/main/resources/application.properties
    echo "s3.SecretKey=${S3_SECRET_KEY}" >> ./src/main/resources/application.properties
    echo "" >> ./src/main/resources/application.properties
    echo "logging.file.path=logs" >> ./src/main/resources/application.properties
```

#### application.properties 생성 및 환경 변수 할당

- Github-action이 로컬에서 실행되지 않기때문에 gitignore에 등록된 application.properties 파일을 읽어올 수 없어, EC2에서 애플리케이션 서버가 정상적으로 실행되지 않는다는 것을 파악하였습니다.
    - application.properties 파일은 보안상 중요한 파일이므로 Github에 업로드 하지 않습니다.
        때문에 빌드 직전에 Secret에 저장된 변수를 참조하여 properties 파일을 만들고 기존의 파일과 함께 빌드해야 했습니다.

####  env:

- 환경 변수를 Github-action의 Secrets에서 참조하여 사용합니다.
- 변경될 수 있는 환경변수 값을 상단에 한번 더 매핑하여 가독성과 유지보수성을 높였습니다.

## 최종 yml```java
name: CI/CD AWS EC2 Docker

on:
  push:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:
    # 기본 설정 및 application.yml 생성
    runs-on: ubuntu-latest

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      DATABASE_USERNAME: ${{ secrets.DATABASE_USERNAME }}
      DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
      S3_ACCESS_KEY: ${{ secrets.S3_ACCESS_KEY }}
      S3_SECRET_KEY: ${{ secrets.S3_SECRET_KEY }}

    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'

    - name: Make application.properties
      run: |
        echo "spring.messages.basename=errors" > ./src/main/resources/application.properties
        echo "server.servlet.session.tracking-modes=cookie" >> ./src/main/resources/application.properties
        echo "server.error.whitelabel.enabled=false" >> ./src/main/resources/application.properties
        echo "server.servlet.session.timeout=7500" >> ./src/main/resources/application.properties
        echo "" >> ./src/main/resources/application.properties
        echo "spring.datasource.url=${DATABASE_URL}" >> ./src/main/resources/application.properties
        echo "spring.datasource.username=${DATABASE_USERNAME}" >> ./src/main/resources/application.properties
        echo "spring.datasource.password=${DATABASE_PASSWORD}" >> ./src/main/resources/application.properties
        echo "" >> ./src/main/resources/application.properties
        echo "spring.servlet.multipart.max-file-size=4MB" >> ./src/main/resources/application.properties
        echo "spring.servlet.multipart.max-request-size=20MB" >> ./src/main/resources/application.properties
        echo "" >> ./src/main/resources/application.properties
        echo "# aws 설정" >> ./src/main/resources/application.properties
        echo "cloud.aws.region.static=ap-northeast-2" >> ./src/main/resources/application.properties
        echo "cloud.aws.stack.auto=false" >> ./src/main/resources/application.properties
        echo "s3.AccessKey=${S3_ACCESS_KEY}" >> ./src/main/resources/application.properties
        echo "s3.SecretKey=${S3_SECRET_KEY}" >> ./src/main/resources/application.properties
        echo "" >> ./src/main/resources/application.properties
        echo "logging.file.path=logs" >> ./src/main/resources/application.properties

    - name: Build with Gradle
      run: ./gradlew build

    ## 도커 이미지 빌드 후 도커허브에 push하기
    - name: web docker build and push
      run: |
        docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
        docker build --platform linux/amd64 -f Dockerfile -t ${{ secrets.DOCKER_REPO }} .
        docker push ${{ secrets.DOCKER_REPO }}

    ## 서버에 접속하여 도커 이미지를 pull 받고 실행하기
    - name: executing remote ssh commands using password
      uses: appleboy/ssh-action@v0.1.6
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.EC2_USERNAME }}
        key: ${{ secrets.KEY }}
        port: 22
        script: |
          sudo docker stop prod-server
          sudo docker rm prod-server
          sudo docker image rm ${{ secrets.DOCKER_REPO }}
          sudo docker pull ${{ secrets.DOCKER_REPO }}
          sudo docker run -d -p 8080:8080 ${{ secrets.DOCKER_REPO }}
```

## 회고
Spring Boot와 GitHub Actions를 활용하여 GitHub에 Push 하면, 자동으로 빌드, 테스트, 도커 이미지 생성, 그리고 EC2로의 배포까지 모든 작업을 자동화하는 프로세스를 구현해 보았습니다. 빌드 후 파일을 EC2 서버로 복사하고, 서버에서 명령어를 입력하여 실행했던 번거로운 이전의 방식과는 달리, 이 방식은 안정성과 배포 속도에서 큰 이점을 제공하였습니다. 그러나 직접 검수하는 단계가 없기 때문에, 이에 상응하여 테스트 파일 작성에 더욱 신경을 써야 할 필요성을 느꼈습니다.
