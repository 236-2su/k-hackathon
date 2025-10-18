package com.hack.app.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zep_user_id", nullable = false, length = 100, unique = true)
    private String zepUserId;

    @Column(name = "name", nullable = false, length = 100)
    private String nickname;

    @Column(nullable = false, length = 50)
    private String job = "무직";

    @Column(nullable = false, name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    private Long gold = 100L;

    public User(String zepUserId, String nickname) {
        this.zepUserId = zepUserId;
        this.nickname = (nickname != null && !nickname.isBlank()) ? nickname : zepUserId;
    }
}