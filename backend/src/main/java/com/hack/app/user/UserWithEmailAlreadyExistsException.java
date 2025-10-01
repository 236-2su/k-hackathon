package com.hack.app.user;

public class UserWithEmailAlreadyExistsException extends RuntimeException {
    public UserWithEmailAlreadyExistsException(String email) {
        super("이미 등록된 이메일입니다. email=" + email);
    }
}
