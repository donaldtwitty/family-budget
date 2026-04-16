package com.familybudget.repository;

import com.familybudget.model.AppDataEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppDataRepository extends JpaRepository<AppDataEntity, Long> {
    Optional<AppDataEntity> findByHouseholdId(String householdId);
}
