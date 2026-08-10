package com.nextgen.placementportal.repository;

import com.nextgen.placementportal.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Eagerly fetch company to ensure companyName is populated in the DTO
    @Query("SELECT a FROM Application a LEFT JOIN FETCH a.company WHERE a.studentId = :studentId")
    List<Application> findByStudentId(@Param("studentId") Long studentId);

    List<Application> findByStudentIdAndStatus(Long studentId, String status);
    long countByStudentIdAndStatus(Long studentId, String status);
    List<Application> findByCompanyId(Long companyId);
    List<Application> findByCompanyIdAndStatus(Long companyId, String status);
}

