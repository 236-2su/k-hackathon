package com.hack.app.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserRequest(
    @NotBlank(message = "유저 ID를 입력해 주세요") String userId,
    @NotBlank(message = "직업을 입력해 주세요") String job
) {}