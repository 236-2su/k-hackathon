package com.hack.app.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserRequest(
    @NotBlank(message = "이름을 입력해주세요") String name,
    @NotBlank(message = "이메일을 입력해주세요") @Email(message = "유효한 이메일 주소를 입력해주세요") String email
) {}
