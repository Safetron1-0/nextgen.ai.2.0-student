package com.nextgen.placementportal.repository;

import com.nextgen.placementportal.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    long countByStudentIdAndIsRead(Long studentId, Boolean isRead);
}
