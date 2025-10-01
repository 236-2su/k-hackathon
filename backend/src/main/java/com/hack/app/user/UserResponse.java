package com.hack.app.user;

import java.time.OffsetDateTime;

public record UserResponse(Long id, String name, String email, OffsetDateTime createdAt) {
    public static UserResponse from(User entity) {
        return new UserResponse(entity.getId(), entity.getName(), entity.getEmail(), entity.getCreatedAt());
    }
}
