package com.nextgen.placementportal.repository;

import com.nextgen.placementportal.model.OnDutyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnDutyRequestRepository extends JpaRepository<OnDutyRequest, Long> {
    List<OnDutyRequest> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<OnDutyRequest> findAllByOrderByCreatedAtDesc();
}
