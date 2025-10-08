package com.hack.app.games.typing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface SentenceRepository extends JpaRepository<Sentence, Long> {
    // H2, PostgreSQL, Oracle 등 다른 DB에서는 ORDER BY RANDOM() 또는 다른 함수를 사용해야 할 수 있습니다.
    @Query(value = "SELECT * FROM sentence ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Sentence findRandomSentence();

    @Query(value = "SELECT * FROM sentence WHERE id NOT IN :excludeIds ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Sentence findRandomSentenceExcludingIds(java.util.List<Long> excludeIds);
}
