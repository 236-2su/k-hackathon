package com.hack.app.user;

import jakarta.validation.constraints.NotBlank;

public record PortalMoveRequest(
    @NotBlank(message = "유저 ID를 입력해 주세요") String userId
) {}