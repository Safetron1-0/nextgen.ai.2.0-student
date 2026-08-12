#!/bin/bash
mvn clean package -DskipTests
java -jar target/placementportal-0.0.1-SNAPSHOT.jar
