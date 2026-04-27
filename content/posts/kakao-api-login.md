---
title: '카카오 API 로그인 구현하기'
summary: '카카오 OAuth API로 로그인 기능을 직접 구현한다.'
category: spring
tags: []
date: '2023-12-25'
visibility: published
---
## 스프링 부트를 활용한 카카오 API 로그인 구현 가이드

기존 프로젝트에 카카오 로그인 API를 적용하여 회원가입 없이 로그인이 가능하도록 구현해보았습니다.

> [!INFO] 개발 환경
> Spring Boot, Gradle, Java 11.

## OAuth란?

### OAuth의 이점

OAuth(Open Authorization)는 사용자의 권한 부여를 위한 프로토콜로, 다른 애플리케이션이나 웹사이트에서 특정 리소스에 접근할 수 있도록 사용자의 동의를 얻는 데 사용됩니다. 이를 통해 보안성을 유지하면서 서비스 간에 사용자 정보를 공유할 수 있습니다.

### OAuth의 원리

1. **클라이언트 애플리케이션 등록**: 클라이언트 애플리케이션을 등록하고 고유한 클라이언트 ID와 시크릿을 발급받습니다.
2. **인가 코드 요청 및 사용자 리다이렉션**: 사용자가 로그인을 시도하면 클라이언트 애플리케이션은 카카오 인증 서버에 인가 코드를 요청합니다. 이때, Redirect URI를 함께 전달하여 사용자를 인증 서버로 리다이렉션합니다.
3. **사용자 동의 및 인가 코드 발급**: 사용자가 카카오 계정으로 로그인하면 카카오는 사용자에게 동의를 요청하고, 사용자가 동의하면 인가 코드를 발급합니다.
4. **액세스 토큰 발급**: 클라이언트 애플리케이션은 인가 코드와 클라이언트 시크릿을 사용하여 카카오 인증 서버에 액세스 토큰을 요청합니다.
5. **액세스 토큰을 이용한 리소스 요청**: 발급받은 액세스 토큰을 이용하여 사용자의 리소스에 접근합니다.

## 카카오 API 작동원리 및 적용

### 서비스 로그인 작동원리

![](/posts/kakao-api-login/image.png)

### 카카오 API 적용

#### 카카오 디벨로퍼 설정

**키 발급**

- 카카오 디벨로퍼에서 애플리케이션을 추가합니다.

![](/posts/kakao-api-login/img.png)

**동의항목 설정**

- 필요한 동의항목을 설정하여 사용자에게 어떤 정보를 요청할지 결정합니다.

![](/posts/kakao-api-login/img_1.png)

**사이트 도메인 및 Redirect URI 등록**

![](/posts/kakao-api-login/img_2.png)

![](/posts/kakao-api-login/img_3.png)

사이트 도메인과 Redirect URI를 등록합니다.

카카오 API 호출시 이 Redirect URI가 Redirect 되어 키 값을 전달받습니다.

### 프로젝트에 적용

#### 컨트롤러 작성

```bash
@GetMapping("/kakao-login")
public String kakaoLogin(@RequestParam String code, @RequestParam(required = false) String error, HttpSession session) {

	String token = kakaoAPI.getToken(RESTAPI_CODE, REDIRECT_URI, code);
	System.out.println(token);
	KakaoMember kakaoMember = kakaoAPI.getUserInfo(token);

	if (kakaoMember == null) return "redirect:/home";

	String email = kakaoMember.getEmail();
	Member loginMember = memberService.findByEmail(email);

	// 회원이 아닐 때 가입
	if (loginMember == null) {
		boolean validUsernameExist = memberService.validUsernameExist(kakaoMember.getName());

		String nickname = kakaoMember.getName();

		while (validUsernameExist) {
			nickname = kakaoMember.getName();
			nickname = nickname + randomNumberGenerator();
			validUsernameExist = memberService.validUsernameExist(nickname);
		}

		loginMember = memberService.join(new Member(kakaoMember.getEmail(), nickname, String.valueOf(kakaoMember.getId())));

		try {
			myFileUploadUtil.saveProfileImgToS3(kakaoMember.getImage(), loginMember.getId() + ".jpg");
			log.info("profile img success");
			memberService.setProfileImg(loginMember.getId(), loginMember.getId() + ".jpg");

			loginMember = memberService.findByEmail(email);
		} catch (Exception e) {
			log.error("프로필 사진 업로드 오류");
		}
	}

	// 회원일 때 로그인
	Integer memberLevel = SessionConst.COMMON_LOGIN;
	session.setAttribute(SessionConst.LOGIN_MEMBER, loginMember.getId());
	session.setAttribute(SessionConst.LOGIN_LEVEL, memberLevel);
	session.setAttribute("currentMember", loginMember);

	return "redirect:/home";
}
```

#### 카카오 API  Class 작성

```java
package kun.pomondor.domain.util;

import kun.pomondor.domain.KakaoMember;
import org.json.JSONObject;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Component
public class KakaoAPI {

	public String getToken(String restApiCode, String redirectUri, String code) {
		RestTemplate restTemplate = new RestTemplate();

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

		// 파라미터 세팅
		MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
		body.add("grant_type", "authorization_code");
		body.add("client_id", restApiCode);
		body.add("redirect_uri", redirectUri);
		body.add("code", code);

		// 엔티티 생성
		HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);

		// POST 요청 전송
		ResponseEntity<String> responseEntity = restTemplate.postForEntity("https://kauth.kakao.com/oauth/token", requestEntity, String.class);

		// 응답
		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		return jsonObject.getString("access_token");
	}

	public KakaoMember getUserInfo(String token) {
		RestTemplate restTemplate = new RestTemplate();
		HttpHeaders headers = new HttpHeaders();

		headers.add("Content-type", "application/x-www-form-urlencoded;charset=utf-8");
		headers.add("Authorization", "Bearer " + token);

		// 엔티티 생성
		HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(headers);

		// POST 요청 전송
		ResponseEntity<String> responseEntity = restTemplate.exchange("https://kapi.kakao.com/v2/user/me", HttpMethod.POST, requestEntity, String.class);

		// 응답
		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		String email = jsonObject.getJSONObject("kakao_account").getString("email");
		String name = jsonObject.getJSONObject("properties").getString("nickname");
		Long id = jsonObject.getLong("id");
		String image = jsonObject.getJSONObject("kakao_account").getJSONObject("profile").getString("profile_image_url");

		return new KakaoMember(id, email, name, image);
	}
}
```

- 카카오 API를 활용하기 위해 작성한 Class 입니다.

#### getToken

- getToken 메서드는 restApiCode, redirectUri와 받아온 code를 활용하여 HTTP 요청을 생성하고 전송합니다.
- 반환된 JSON 응답을 파싱하여 토근 값을 획득합니다.
    - API 요청에 필요한 헤더와 본문, 응답은 카카오 developers 페이지의 문서에 자세히 기재되어 있습니다.

![](/posts/kakao-api-login/img_4.png)

![](/posts/kakao-api-login/img_5.png)

#### getUserInfo

- getUserInfo 메서드는 getToken에서 반환된 token으로 사용자의 정보를 요청하여 동의항목에 대한 정보를 응답받습니다.

![](/posts/kakao-api-login/img_6.png)

![](/posts/kakao-api-login/img_7.png)

- HTTP 요청 편의를 위해 RestTemplate 라이브러리를 활용하였습니다.

#### 로그인 및 사용자 정보 활용

- getUserInfo 메서드로 응답받은 정보를 활용합니다.
- 이메일로 가입된 정보가 존재한다면 그 이메일로 로그인되도록 하고, 없을시 자동 가입 후 로그인하도록 설정하였습니다.

## 회고

기존 프로젝트에 카카오 로그인 API를 적용해보며 OAuth 프로토콜의 과정을 경험해볼 수 있었습니다. API로 제공받은 정보를 어떤 방식으로 활용할지 고민해보는것도 공부에 많은 도움이 되었습니다.

출처 : 카카오 디벨로퍼 API
