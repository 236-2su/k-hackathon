package com.hack.app.user;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String name) {
        super("사용자를 찾을 수 없습니다. name=" + name);
    }
}
