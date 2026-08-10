package com.nextgen.placementportal.repository;

import com.nextgen.placementportal.model.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByCategory(String category);
    List<Resource> findAllByOrderByCreatedAtDesc();
}
