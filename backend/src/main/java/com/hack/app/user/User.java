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

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String job = "무직"; // 기본값 "무직"

    @Column(nullable = false, name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    private Long gold = 100L; // 기본값 100

    public User(String userId) {
        this.name = userId;
    }
}
