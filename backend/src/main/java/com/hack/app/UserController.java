package com.hack.app;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class UserController {

    private static final List<User> users = new ArrayList<>();
    private static Long nextId = 1L;

    static {
        users.add(new User(nextId++, "홍길동", "hong@example.com"));
        users.add(new User(nextId++, "김철수", "kim@example.com"));
        users.add(new User(nextId++, "이영희", "lee@example.com"));
    }

    @GetMapping("/users")
    public List<User> getUsers() {
        return users;
    }

    @PostMapping("/users")
    public User createUser(@RequestBody Map<String, String> userData) {
        User newUser = new User(
            nextId++,
            userData.get("name"),
            userData.get("email")
        );
        users.add(newUser);
        return newUser;
    }

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return users.stream()
            .filter(user -> user.getId().equals(id))
            .findFirst()
            .orElse(null);
    }

    public static class User {
        private Long id;
        private String name;
        private String email;

        public User(Long id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        
        public void setId(Long id) { this.id = id; }
        public void setName(String name) { this.name = name; }
        public void setEmail(String email) { this.email = email; }
    }
}
