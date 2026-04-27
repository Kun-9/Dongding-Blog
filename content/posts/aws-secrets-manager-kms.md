---
title: 'AWS의 SecretsManager, Key Management Service(KMS)를 활용한 Secrets 관리'
summary: 'AWS Secrets Manager와 KMS로 민감 정보를 안전하게 관리한다.'
category: system
tags: []
date: '2025-01-03'
visibility: published
---
# Key Management Service(KMS)

1. 암호화 키 생성 및 관리

- 대칭키와 비대칭키 모두 생성 가능
- 키의 생성, 교체, 비활성화, 삭제 등 전체 수명 주기 관리

2. 데이터 암호화/복호화

- AWS 서비스(S3, RDS)와 통합되어 데이터 암호화 지원
- 애플리케이션에서 직접 KMS API를 호출하여 데이터 암호화/복호화 가능

3. 보안 기능

- IAM과 통합된 세밀한 접근 제어
- CloudTrail과 연동하여 키 사용 감사(audit) 로그 제공

4. 중앙 집중식 키 관리

- 여러 AWS 리전과 계정에 걸쳐 키를 중앙에서 관리
- 키 정책을 통한 세부적인 권한 제어

> [!NOTE] 요약
> 직접 암호화 키를 관리하지 않고 안전하게 데이터를 보호할 수 있게 해주는 서비스 (암호화·복호화 기능).

# SecretsManager

1. 민감정보(Secrets)를 저장하고 관리

- DB 자격 증명 정보, 암호화 키, 각종 계정 정보
- 저장시 내부적으로 KMS 암호화

2. 키 교체가 용이
3. 접근 권한 관리 용이

> [!NOTE] KMS와의 차이
> KMS와 유사한 특성을 가지지만, 목적에 차이가 있다.

- KMS — 암호화·복호화
- SecretsManager — Secrets 정보 저장 및 관리

# 암호화/복호화 흐름

1. 권장하지 않는 방식

- Secret 데이터 -> KMS로 암호화 -> SecretsManager에 저장(내부적으로 한번 더 KMS 암호화)

2. 일반적인 방식

- Secret 데이터 -> SecretsManager에 저장(내부적으로 KMS 암호화)

* * *

그럼 KMS를 따로 구현해서 직접 암호화/복호화 할 필요가 있을까?
SecretsManager에 저장하기 위한 데이터라면 내부적으로 KMS를 사용하고,
다른 서비스(DB 등)을 위한 암호화라면 자체 암호화 서비스를 제공한다.

따라서 다음과 같은 특수한 상황일때만 KMS에 위임하여 암호화를 하자.

* * *

### 특수한 상황

- 규제나 컴플라이언스 요구사항으로 특정 데이터의 암호화가 필수일 때
- 여러 AWS 계정이나 리전에 걸쳐 암호화 키를 공유해야 할 때
- 커스텀 암호화 솔루션이 필요할 때

### 대부분의 상황

- AWS 서비스의 기본 암호화 기능 사용
- 시크릿은 SecretsManager 사용
- 설정값은 Parameter Store 사용
