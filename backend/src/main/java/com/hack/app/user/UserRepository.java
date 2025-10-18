package com.hack.app.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByZepUserId(String zepUserId);
    Optional<User> findByNickname(String nickname);
}