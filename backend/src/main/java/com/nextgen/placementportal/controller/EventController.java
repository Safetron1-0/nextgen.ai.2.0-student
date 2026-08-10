package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.dto.EventDTO;
import com.nextgen.placementportal.model.Event;
import com.nextgen.placementportal.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired
    private EventRepository eventRepository;

    // GET /api/events - List all events
    @GetMapping
    public ResponseEntity<List<EventDTO>> getAllEvents() {
        List<EventDTO> events = eventRepository.findAllByOrderByEventDateDesc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(events);
    }

    // GET /api/events/upcoming - Get upcoming events
    @GetMapping("/upcoming")
    public ResponseEntity<List<EventDTO>> getUpcomingEvents() {
        List<EventDTO> events = eventRepository
                .findByEventDateGreaterThanEqualOrderByEventDateAsc(LocalDate.now()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(events);
    }

    // POST /api/events - Create/propose event
    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody EventDTO dto) {
        Event event = new Event();
        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setEventDate(dto.getEventDate());
        event.setEventTime(dto.getEventTime());
        event.setLocation(dto.getLocation());
        event.setCompanyId(dto.getCompanyId());
        event.setEventType(dto.getEventType());
        event.setCreatedBy(dto.getCreatedBy());

        eventRepository.save(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(event));
    }

    // PUT /api/events/{id} - Update event
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody EventDTO dto) {
        Optional<Event> optEvent = eventRepository.findById(id);
        if (optEvent.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Event not found.");
        }

        Event event = optEvent.get();
        if (dto.getTitle() != null) event.setTitle(dto.getTitle());
        if (dto.getDescription() != null) event.setDescription(dto.getDescription());
        if (dto.getEventDate() != null) event.setEventDate(dto.getEventDate());
        if (dto.getEventTime() != null) event.setEventTime(dto.getEventTime());
        if (dto.getLocation() != null) event.setLocation(dto.getLocation());
        if (dto.getEventType() != null) event.setEventType(dto.getEventType());

        eventRepository.save(event);
        return ResponseEntity.ok(toDTO(event));
    }

    // DELETE /api/events/{id} - Delete event
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        if (!eventRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Event not found.");
        }
        eventRepository.deleteById(id);
        return ResponseEntity.ok("Event deleted.");
    }

    private EventDTO toDTO(Event e) {
        EventDTO dto = new EventDTO();
        dto.setId(e.getId());
        dto.setTitle(e.getTitle());
        dto.setDescription(e.getDescription());
        dto.setEventDate(e.getEventDate());
        dto.setEventTime(e.getEventTime());
        dto.setLocation(e.getLocation());
        dto.setCompanyId(e.getCompanyId());
        dto.setEventType(e.getEventType());
        dto.setCreatedBy(e.getCreatedBy());
        if (e.getCompany() != null) {
            dto.setCompanyName(e.getCompany().getName());
        }
        return dto;
    }
}
