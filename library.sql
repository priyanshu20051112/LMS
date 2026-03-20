-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: library
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL,
  `fullname` varchar(100) DEFAULT NULL,
  `department` varchar(20) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `password` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (24106007,'Aarya vardharn vankeepuram','AIML','24106007@apsit.edu.in','24106007@Apsit'),(24106008,'Keshav soni','AIML','24106008@apsit.edu.in','24106008@Apsit'),(24106013,'Sahil waghe','AIML','24106013@apsit.edu.in','24106013@Apsit'),(24106040,'Yashica Thanekar','AIML','24106040@apsit.edu.in','24106040@Apsit'),(24106080,'Pratik Satpute','AIML','24106080@apsit.edu.in','24106080@Apsit'),(24106086,'Suraj Yadav','AIML','24106086@apsit.edu.in','24106086@Apsit'),(24106100,'Simrun Yadav','AIML','24106100@apsit.edu.in','24106100@Apsit'),(24106109,'Ishwar yogi','AIML','24106109@apsit.edu.in','24106109@Apsit'),(24106144,'Annanay Vyas','AIML','24106144@apsit.edu.in','24106144@Apsit'),(24106166,'Vivek Singh','AIML','24106166@apsit.edu.in','24106166@Apsit'),(24106181,'Aastha Vyas','AIML','24106181@apsit.edu.in','24106181@Apsit'),(24106189,'Parth shinde','AIML','24106189@apsit.edu.in','24106189@Apsit'),(24106191,'Priyanshu Upadhyay','AIML','24106191@apsit.edu.in','24106191@Apsit'),(24106201,'Raj Surve','AIML','24106201@apsit.edu.in','24106201@Apsit');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-30  1:20:48
