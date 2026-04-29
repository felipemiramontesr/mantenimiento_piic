-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 29-04-2026 a las 03:46:00
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u701509674_Mant_piic`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `common_catalogs`
--

CREATE TABLE `common_catalogs` (
  `id` int(11) NOT NULL,
  `category` varchar(50) NOT NULL COMMENT 'Group: ASSET_TYPE, BRAND, MODEL, FREQ_TIME, FREQ_USAGE...',
  `parent_id` int(11) DEFAULT NULL COMMENT 'For hierarchical relationships (e.g., Brand -> Model)',
  `code` varchar(50) NOT NULL COMMENT 'Identifier: V_TOYOTA, U_5K_KM',
  `label` varchar(100) NOT NULL COMMENT 'Display Name: Toyota, 5,000 KM',
  `numeric_value` decimal(10,2) DEFAULT NULL COMMENT 'Numeric payload for math (e.g., 5000)',
  `unit` varchar(10) DEFAULT NULL COMMENT 'Measurement unit (km, hrs, days)',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `common_catalogs`
--

INSERT INTO `common_catalogs` (`id`, `category`, `parent_id`, `code`, `label`, `numeric_value`, `unit`, `is_active`, `created_at`) VALUES
(1, 'ASSET_TYPE', NULL, 'AT_VEH', 'Vehiculo', NULL, NULL, 1, '2026-04-19 05:04:24'),
(2, 'ASSET_TYPE', NULL, 'AT_MAQ', 'Maquinaria', NULL, NULL, 1, '2026-04-19 04:41:18'),
(3, 'ASSET_TYPE', NULL, 'AT_HER', 'Herramienta', NULL, NULL, 1, '2026-04-19 04:41:18'),
(4, 'FREQ_TIME', NULL, 'T_DIARIA', 'Diaria', 1.00, 'days', 1, '2026-04-17 22:59:11'),
(5, 'FREQ_TIME', NULL, 'T_SEMANAL', 'Semanal', 7.00, 'days', 1, '2026-04-17 22:59:11'),
(6, 'FREQ_TIME', NULL, 'T_MENSUAL', 'Mensual', 30.00, 'days', 1, '2026-04-17 22:59:11'),
(7, 'FREQ_TIME', NULL, 'T_TRIMEST', 'Trimestral', 90.00, 'days', 1, '2026-04-17 22:59:11'),
(8, 'FREQ_TIME', NULL, 'T_BIMEST', 'Bimestral', 60.00, 'days', 1, '2026-04-17 22:59:11'),
(9, 'FREQ_TIME', NULL, 'T_SEMEST', 'Semestral', 180.00, 'days', 1, '2026-04-17 22:59:11'),
(10, 'FUEL', NULL, 'F_DIESEL', 'Diesel', NULL, NULL, 1, '2026-04-19 05:04:24'),
(11, 'FUEL', NULL, 'F_GAS', 'Gasolina', NULL, NULL, 1, '2026-04-19 05:04:24'),
(12, 'FUEL', NULL, 'F_ELEC', 'Eléctrico', NULL, NULL, 1, '2026-04-19 04:41:18'),
(20, 'DRIVE_TYPE', NULL, 'DR_4X2', '4x2', NULL, NULL, 1, '2026-04-19 05:04:24'),
(21, 'DRIVE_TYPE', NULL, 'DR_4X4', '4x4', NULL, NULL, 1, '2026-04-19 05:04:24'),
(22, 'DRIVE_TYPE', NULL, 'DR_AWD', 'AWD', NULL, NULL, 1, '2026-04-19 04:41:18'),
(23, 'BRAND', 1, 'B_NISSAN', 'Nissan', NULL, NULL, 1, '2026-04-17 22:59:12'),
(24, 'BRAND', 1, 'B_FORD', 'Ford', NULL, NULL, 1, '2026-04-17 22:59:12'),
(28, 'BRAND', 2, 'B_CAT', 'Caterpillar', NULL, NULL, 1, '2026-04-17 22:59:12'),
(30, 'TRANSMISSION', NULL, 'TR_AUTO', 'Automática', NULL, NULL, 1, '2026-04-19 05:04:24'),
(31, 'TRANSMISSION', NULL, 'TR_MAN', 'Estándar (Manual)', NULL, NULL, 1, '2026-04-19 05:04:24'),
(32, 'BRAND', 1, 'B_CHEVROLET', 'Chevrolet', NULL, NULL, 1, '2026-04-18 00:23:36'),
(33, 'BRAND', 1, 'B_RAM', 'RAM / Dodge', NULL, NULL, 1, '2026-04-18 00:23:36'),
(34, 'BRAND', 1, 'B_VW', 'Volkswagen', NULL, NULL, 1, '2026-04-18 00:23:36'),
(35, 'BRAND', 1, 'B_MITSUBISHI', 'Mitsubishi', NULL, NULL, 1, '2026-04-18 00:23:36'),
(36, 'BRAND', 1, 'B_HYUNDAI', 'Hyundai', NULL, NULL, 1, '2026-04-18 00:23:36'),
(37, 'BRAND', 1, 'B_KIA', 'KIA', NULL, NULL, 1, '2026-04-18 00:23:36'),
(38, 'BRAND', 1, 'B_MAZDA', 'Mazda', NULL, NULL, 1, '2026-04-18 00:23:36'),
(39, 'BRAND', 1, 'B_MG', 'MG', NULL, NULL, 1, '2026-04-18 00:23:36'),
(44, 'BRAND', 1, 'B_CHANGAN', 'Changan', NULL, NULL, 1, '2026-04-18 00:23:36'),
(45, 'BRAND', 1, 'B_KW', 'Kenworth', NULL, NULL, 1, '2026-04-18 00:23:36'),
(46, 'BRAND', 1, 'B_FRTL', 'Freightliner', NULL, NULL, 1, '2026-04-18 00:23:36'),
(47, 'BRAND', 1, 'B_INTL', 'International', NULL, NULL, 1, '2026-04-18 00:23:36'),
(48, 'BRAND', 1, 'B_ISUZU', 'Isuzu', NULL, NULL, 1, '2026-04-18 00:23:36'),
(49, 'BRAND', 1, 'B_HINO', 'Hino', NULL, NULL, 1, '2026-04-18 00:23:36'),
(50, 'BRAND', 1, 'B_MERCEDES_T', 'Mercedes-Benz Trucks', NULL, NULL, 1, '2026-04-18 00:23:36'),
(51, 'BRAND', 1, 'B_SCANIA', 'Scania', NULL, NULL, 1, '2026-04-18 00:23:36'),
(52, 'BRAND', 1, 'B_VOLVO_T', 'Volvo Trucks', NULL, NULL, 1, '2026-04-18 00:23:36'),
(170, 'MODEL', 28, 'M_CAT_320', 'Excavadora 320', NULL, NULL, 1, '2026-04-18 00:23:36'),
(171, 'MODEL', 28, 'M_CAT_336', 'Excavadora 336', NULL, NULL, 1, '2026-04-18 00:23:36'),
(172, 'MODEL', 28, 'M_CAT_349', 'Excavadora 349', NULL, NULL, 1, '2026-04-18 00:23:36'),
(173, 'MODEL', 28, 'M_CAT_395', 'Excavadora 395', NULL, NULL, 1, '2026-04-18 00:23:36'),
(174, 'MODEL', 28, 'M_CAT_305', 'Mini Excavadora 305', NULL, NULL, 1, '2026-04-18 00:23:36'),
(175, 'MODEL', 28, 'M_CAT_416', 'Retroexcavadora 416', NULL, NULL, 1, '2026-04-18 00:23:36'),
(176, 'MODEL', 28, 'M_CAT_420', 'Retroexcavadora 420', NULL, NULL, 1, '2026-04-18 00:23:36'),
(177, 'MODEL', 28, 'M_CAT_430', 'Retroexcavadora 430', NULL, NULL, 1, '2026-04-18 00:23:36'),
(178, 'MODEL', 28, 'M_CAT_450', 'Retroexcavadora 450', NULL, NULL, 1, '2026-04-18 00:23:36'),
(179, 'MODEL', 28, 'M_CAT_D5', 'Tractor D5', NULL, NULL, 1, '2026-04-18 00:23:36'),
(180, 'MODEL', 28, 'M_CAT_D6', 'Tractor D6', NULL, NULL, 1, '2026-04-18 00:23:36'),
(181, 'MODEL', 28, 'M_CAT_D8', 'Tractor D8', NULL, NULL, 1, '2026-04-18 00:23:36'),
(182, 'MODEL', 28, 'M_CAT_D11', 'Tractor D11', NULL, NULL, 1, '2026-04-18 00:23:36'),
(183, 'MODEL', 28, 'M_CAT_120', 'Motoniveladora 120', NULL, NULL, 1, '2026-04-18 00:23:36'),
(184, 'MODEL', 28, 'M_CAT_140', 'Motoniveladora 140', NULL, NULL, 1, '2026-04-18 00:23:36'),
(185, 'MODEL', 28, 'M_CAT_160', 'Motoniveladora 160', NULL, NULL, 1, '2026-04-18 00:23:36'),
(186, 'MODEL', 28, 'M_CAT_950', 'Cargador Frontal 950', NULL, NULL, 1, '2026-04-18 00:23:36'),
(187, 'MODEL', 28, 'M_CAT_966', 'Cargador Frontal 966', NULL, NULL, 1, '2026-04-18 00:23:36'),
(188, 'MODEL', 28, 'M_CAT_988', 'Cargador Frontal 988', NULL, NULL, 1, '2026-04-18 00:23:36'),
(189, 'MODEL', 28, 'M_JD_310L', 'Retro 310L', NULL, NULL, 1, '2026-04-18 00:23:36'),
(190, 'MODEL', 28, 'M_JD_410L', 'Retro 410L', NULL, NULL, 1, '2026-04-18 00:23:36'),
(192, 'MODEL', 438, 'M_KOM_PC200', 'PC200', NULL, NULL, 1, '2026-04-18 00:23:36'),
(193, 'MODEL', 438, 'M_KOM_PC450', 'PC450', NULL, NULL, 1, '2026-04-18 00:23:36'),
(194, 'MODEL', 438, 'M_KOM_D65', 'D65', NULL, NULL, 1, '2026-04-18 00:23:36'),
(195, 'MODEL', 438, 'M_KOM_GD555', 'GD555', NULL, NULL, 1, '2026-04-18 00:23:36'),
(196, 'MODEL', 440, 'M_M18_IMP12', 'M18 Fuel Impact 1/2', NULL, NULL, 1, '2026-04-18 00:23:36'),
(197, 'MODEL', 440, 'M_M18_IMP34', 'M18 Fuel Impact 3/4', NULL, NULL, 1, '2026-04-18 00:23:36'),
(198, 'MODEL', 440, 'M_M18_IMP1', 'M18 Fuel Impact 1', NULL, NULL, 1, '2026-04-18 00:23:36'),
(199, 'MODEL', 440, 'M_M12_DIAG', 'M12 Diagnostic', NULL, NULL, 1, '2026-04-18 00:23:36'),
(200, 'MODEL', 440, 'M_ROCK_LIT', 'Torres Lighting Rocket', NULL, NULL, 1, '2026-04-18 00:23:36'),
(201, 'MODEL', 442, 'M_TE_70', 'Rotomartillo TE 70', NULL, NULL, 1, '2026-04-18 00:23:36'),
(202, 'MODEL', 442, 'M_TE_80', 'Rotomartillo TE 80', NULL, NULL, 1, '2026-04-18 00:23:36'),
(203, 'MODEL', 442, 'M_TE_3000', 'Demoledor TE 3000', NULL, NULL, 1, '2026-04-18 00:23:36'),
(204, 'MODEL', 442, 'M_DD_150', 'Core Drill DD 150', NULL, NULL, 1, '2026-04-18 00:23:36'),
(205, 'MODEL', 442, 'M_PS_1000', 'Scanner PS 1000', NULL, NULL, 1, '2026-04-18 00:23:36'),
(206, 'MODEL', 441, 'M_87V', 'Multímetro 87V', NULL, NULL, 1, '2026-04-18 00:23:36'),
(212, 'DRIVE_TYPE', NULL, 'DR_ORUGA', 'Oruga', NULL, NULL, 1, '2026-04-19 00:49:45'),
(213, 'DRIVE_TYPE', NULL, 'DR_NA', 'No Aplica', NULL, NULL, 1, '2026-04-19 00:49:45'),
(216, 'TRANSMISSION', NULL, 'TR_CVT', 'CVT', NULL, NULL, 1, '2026-04-19 00:49:45'),
(217, 'TRANSMISSION', NULL, 'TR_HIDRO', 'Hidrostática', NULL, NULL, 1, '2026-04-19 00:49:45'),
(218, 'TRANSMISSION', NULL, 'TR_NA', 'No Aplica', NULL, NULL, 1, '2026-04-19 00:49:45'),
(219, 'FUEL', NULL, 'F_MIX_2T', 'Mezcla (2 Tiempos)', NULL, NULL, 1, '2026-04-19 00:52:11'),
(220, 'FUEL', NULL, 'F_BATT', 'Batería (Li-Ion)', NULL, NULL, 1, '2026-04-19 00:52:11'),
(221, 'FUEL', NULL, 'F_PNEU', 'Neumático (Aire)', NULL, NULL, 1, '2026-04-19 00:52:11'),
(222, 'DEPARTMENT', NULL, 'D_ADMIN', 'Administración', NULL, NULL, 1, '2026-04-23 01:44:17'),
(223, 'DEPARTMENT', NULL, 'D_EXPLOR', 'Exploración', NULL, NULL, 1, '2026-04-23 01:44:17'),
(224, 'DEPARTMENT', NULL, 'D_GEOL', 'Geología', NULL, NULL, 1, '2026-04-23 01:44:17'),
(225, 'DEPARTMENT', NULL, 'D_LAB', 'Laboratorio', NULL, NULL, 1, '2026-04-23 01:44:17'),
(226, 'DEPARTMENT', NULL, 'D_MANT_E', 'Mantenimiento Eléctrico', NULL, NULL, 1, '2026-04-23 01:44:17'),
(227, 'DEPARTMENT', NULL, 'D_MANT_P', 'Mantenimiento Planta', NULL, NULL, 1, '2026-04-23 01:44:17'),
(228, 'DEPARTMENT', NULL, 'D_MED_AMB', 'Medio Ambiente', NULL, NULL, 1, '2026-04-23 01:44:17'),
(229, 'DEPARTMENT', NULL, 'D_OPER_M', 'Operación Mina', NULL, NULL, 1, '2026-04-23 01:44:17'),
(230, 'DEPARTMENT', NULL, 'D_OPER_P', 'Operación Planta', NULL, NULL, 1, '2026-04-23 01:44:17'),
(231, 'DEPARTMENT', NULL, 'D_PLAN', 'Planeación', NULL, NULL, 1, '2026-04-23 01:44:17'),
(232, 'DEPARTMENT', NULL, 'D_REL_COM', 'Relaciones Comunitarias', NULL, NULL, 1, '2026-04-23 01:44:17'),
(233, 'DEPARTMENT', NULL, 'D_SEG_PAT', 'Seguridad Patrimonial', NULL, NULL, 1, '2026-04-23 01:44:17'),
(234, 'DEPARTMENT', NULL, 'D_SEG_IND', 'Seguridad Industrial', NULL, NULL, 1, '2026-04-23 01:44:17'),
(236, 'OPERATIONAL_USE', NULL, 'USE_SUP', 'Ciudad/Carretera', NULL, NULL, 1, '2026-04-23 02:29:00'),
(237, 'OPERATIONAL_USE', NULL, 'USE_TRA_P', 'Transporte de Personal', NULL, NULL, 1, '2026-04-23 02:29:00'),
(238, 'OPERATIONAL_USE', NULL, 'USE_CAR_L', 'Carga Ligera (Utilitario)', NULL, NULL, 1, '2026-04-23 02:29:00'),
(239, 'OPERATIONAL_USE', NULL, 'USE_CAR_P', 'Planta/Pesado', NULL, NULL, 1, '2026-04-23 02:29:00'),
(240, 'OPERATIONAL_USE', NULL, 'USE_ARR_P', 'Arrastre y Remolque', NULL, NULL, 1, '2026-04-23 02:29:00'),
(241, 'OPERATIONAL_USE', NULL, 'USE_OP_EXT', 'Terracería Leve', NULL, NULL, 1, '2026-04-23 02:29:00'),
(242, 'OPERATIONAL_USE', NULL, 'USE_MINA', 'Operación Mina (Socavón)', NULL, NULL, 1, '2026-04-23 02:29:00'),
(243, 'TIRE_BRAND', NULL, 'TB_MICHELIN', 'MICHELIN', NULL, NULL, 1, '2026-04-23 02:29:00'),
(244, 'TIRE_BRAND', NULL, 'TB_BFG', 'BF GOODRICH', NULL, NULL, 1, '2026-04-23 02:29:00'),
(245, 'LUBE_BRAND', NULL, 'LB_ROSHFRANS', 'Roshfrans', NULL, NULL, 1, '2026-04-23 02:29:00'),
(246, 'LUBE_BRAND', NULL, 'LB_MOBIL', 'Mobil', NULL, NULL, 1, '2026-04-23 02:29:00'),
(247, 'FILTER_BRAND', NULL, 'FB_DONALDSON', 'Donaldson', NULL, NULL, 1, '2026-04-23 02:29:00'),
(248, 'FILTER_BRAND', NULL, 'FB_FLEETGUARD', 'Fleetguard', NULL, NULL, 1, '2026-04-23 02:29:00'),
(253, 'BRAND', 1, 'B_TOYOTA', 'Toyota', NULL, NULL, 1, '2026-04-23 02:29:00'),
(254, 'BRAND', 1, 'B_HONDA', 'Honda', NULL, NULL, 1, '2026-04-23 02:29:00'),
(255, 'BRAND', 1, 'B_SUZUKI', 'Suzuki', NULL, NULL, 1, '2026-04-23 02:29:00'),
(256, 'BRAND', 1, 'B_JAC', 'JAC', NULL, NULL, 1, '2026-04-23 02:29:00'),
(257, 'BRAND', 1, 'B_BYD', 'BYD', NULL, NULL, 1, '2026-04-23 02:29:00'),
(258, 'BRAND', 1, 'B_CHIREY', 'Chirey', NULL, NULL, 1, '2026-04-23 02:29:00'),
(259, 'BRAND', 1, 'B_OMODA', 'Omoda', NULL, NULL, 1, '2026-04-23 02:29:00'),
(260, 'BRAND', 1, 'B_GWM', 'GWM (Haval)', NULL, NULL, 1, '2026-04-23 02:29:00'),
(261, 'BRAND', 1, 'B_SHACMAN', 'Shacman', NULL, NULL, 1, '2026-04-23 02:29:00'),
(262, 'BRAND', 1, 'B_SITRAK', 'Sitrak', NULL, NULL, 1, '2026-04-23 02:29:00'),
(263, 'BRAND', 1, 'B_FOTON', 'Foton', NULL, NULL, 1, '2026-04-23 02:29:00'),
(264, 'TIRE_BRAND', NULL, 'TB_ZMAX', 'ZMAX', NULL, NULL, 1, '2026-04-24 02:29:54'),
(265, 'TIRE_BRAND', NULL, 'TB_PIRELLI', 'PIRELLI', NULL, NULL, 1, '2026-04-24 02:29:54'),
(266, 'TIRE_BRAND', NULL, 'TB_BRIDGESTONE', 'BRIDGESTONE', NULL, NULL, 1, '2026-04-24 02:29:54'),
(267, 'TIRE_BRAND', NULL, 'TB_YOKOHAMA', 'YOKOHAMA', NULL, NULL, 1, '2026-04-24 02:29:54'),
(268, 'TIRE_BRAND', NULL, 'TB_GOODYEAR', 'Goodyear', NULL, NULL, 1, '2026-04-24 02:29:54'),
(269, 'TERRAIN_TYPE', NULL, 'TT_AT', 'All-Terrain (A/T)', NULL, NULL, 1, '2026-04-24 02:29:54'),
(270, 'TERRAIN_TYPE', NULL, 'TT_MT', 'Mud-Terrain (M/T)', NULL, NULL, 1, '2026-04-24 02:29:54'),
(271, 'TERRAIN_TYPE', NULL, 'TT_HT', 'High Terrain (H/T)', NULL, NULL, 1, '2026-04-24 02:29:54'),
(272, 'TERRAIN_TYPE', NULL, 'TT_PASS', 'Passenger / City', NULL, NULL, 1, '2026-04-24 02:29:54'),
(273, 'TERRAIN_TYPE', NULL, 'TT_LT', 'Carga (LT/Range E)', NULL, NULL, 1, '2026-04-24 02:29:54'),
(274, 'TERRAIN_TYPE', NULL, 'TT_SUV', 'SUV / Highway', NULL, NULL, 1, '2026-04-24 02:29:54'),
(275, 'OPERATIONAL_USE', NULL, 'USE_MIXTO', 'Uso Mixto', NULL, NULL, 1, '2026-04-24 02:29:54'),
(276, 'OPERATIONAL_USE', NULL, 'USE_PLANTA', 'Operación Planta', NULL, NULL, 1, '2026-04-24 02:29:54'),
(300, 'OPERATIONAL_USE', NULL, 'mina_roca', 'Mina/Roca', NULL, NULL, 1, '2026-04-28 01:26:29'),
(301, 'OPERATIONAL_USE', NULL, 'campo_mina', 'Campo/Mina', NULL, NULL, 1, '2026-04-28 01:26:29'),
(302, 'OPERATIONAL_USE', NULL, 'extremo_lodo', 'Extremo/Lodo', NULL, NULL, 1, '2026-04-28 01:26:29'),
(303, 'OPERATIONAL_USE', NULL, 'reparto', 'Reparto', NULL, NULL, 1, '2026-04-28 01:26:29'),
(304, 'OPERATIONAL_USE', NULL, 'seguridad_patrullaje', 'Seguridad/Patrullaje', NULL, NULL, 1, '2026-04-28 01:26:29'),
(305, 'TERRAIN_TYPE', NULL, 'high_terrain_ht', 'High Terrain (H/T)', NULL, NULL, 1, '2026-04-28 01:26:29'),
(306, 'TERRAIN_TYPE', NULL, 'suv_carretera', 'SUV/Carretera', NULL, NULL, 1, '2026-04-28 01:26:29'),
(307, 'TERRAIN_TYPE', NULL, 'carga_tipo_c', 'Carga (Tipo C)', NULL, NULL, 1, '2026-04-28 01:26:29'),
(308, 'TERRAIN_TYPE', NULL, 'carga_ligera', 'Carga Ligera', NULL, NULL, 1, '2026-04-28 01:26:29'),
(310, 'DEPARTMENT', NULL, 'D_REL_COM_V2', 'Relaciones Comunitarias', NULL, NULL, 1, '2026-04-28 01:26:29'),
(311, 'DEPARTMENT', NULL, 'D_SEG_PAT_V2', 'Seguridad Patrimonial', NULL, NULL, 1, '2026-04-28 01:26:29'),
(413, 'BRAND', 1, 'B_GMC', 'GMC', NULL, NULL, 1, '2026-04-23 19:43:56'),
(414, 'BRAND', 1, 'B_JEEP', 'Jeep', NULL, NULL, 1, '2026-04-23 19:43:56'),
(415, 'BRAND', 1, 'B_CADILLAC', 'Cadillac', NULL, NULL, 1, '2026-04-23 19:43:56'),
(416, 'BRAND', 1, 'B_BUICK', 'Buick', NULL, NULL, 1, '2026-04-23 19:43:56'),
(417, 'BRAND', 1, 'B_PETERBILT', 'Peterbilt', NULL, NULL, 1, '2026-04-23 19:43:56'),
(418, 'BRAND', 1, 'B_MACK', 'Mack', NULL, NULL, 1, '2026-04-23 19:43:56'),
(434, 'BRAND', 2, 'B_JD', 'John Deere', NULL, NULL, 1, '2026-04-23 19:43:56'),
(435, 'BRAND', 2, 'B_BOBCAT', 'Bobcat', NULL, NULL, 1, '2026-04-23 19:43:56'),
(436, 'BRAND', 2, 'B_JCB', 'JCB', NULL, NULL, 1, '2026-04-23 19:43:56'),
(437, 'BRAND', 2, 'B_VOLVO_CE', 'Volvo CE', NULL, NULL, 1, '2026-04-23 19:43:56'),
(438, 'BRAND', 2, 'B_KOMATSU', 'Komatsu', NULL, NULL, 1, '2026-04-23 19:43:56'),
(440, 'BRAND', 3, 'B_MILWAUKEE', 'Milwaukee', NULL, NULL, 1, '2026-04-23 19:43:56'),
(441, 'BRAND', 3, 'B_DEWALT', 'DeWalt', NULL, NULL, 1, '2026-04-23 19:43:56'),
(442, 'BRAND', 3, 'B_HILTI', 'Hilti', NULL, NULL, 1, '2026-04-23 19:43:56'),
(443, 'BRAND', 3, 'B_MAKITA', 'Makita', NULL, NULL, 1, '2026-04-23 19:43:56'),
(444, 'BRAND', 3, 'B_BOSCH', 'Bosch', NULL, NULL, 1, '2026-04-23 19:43:56'),
(525, 'MODEL', 23, 'M_NIS_NP300', 'NP300 / Frontier', NULL, NULL, 1, '2026-04-23 22:50:58'),
(526, 'MODEL', 23, 'M_NIS_URVAN', 'Urvan NV350', NULL, NULL, 1, '2026-04-23 22:50:58'),
(527, 'MODEL', 23, 'M_NIS_MARCH', 'March', NULL, NULL, 1, '2026-04-23 22:50:58'),
(528, 'MODEL', 23, 'M_NIS_VERSA', 'Versa', NULL, NULL, 1, '2026-04-23 22:50:58'),
(529, 'MODEL', 23, 'M_NIS_SENTRA', 'Sentra', NULL, NULL, 1, '2026-04-23 22:50:58'),
(530, 'MODEL', 23, 'M_NIS_KICKS', 'Kicks', NULL, NULL, 1, '2026-04-23 22:50:58'),
(531, 'MODEL', 23, 'M_NIS_XTR', 'X-Trail', NULL, NULL, 1, '2026-04-23 22:50:58'),
(532, 'MODEL', 23, 'M_NIS_PATH', 'Pathfinder', NULL, NULL, 1, '2026-04-23 22:50:58'),
(533, 'MODEL', 24, 'M_FORD_F150', 'F-150 / Lobo', NULL, NULL, 1, '2026-04-23 22:50:58'),
(534, 'MODEL', 24, 'M_FORD_F250', 'F-250 Super Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(535, 'MODEL', 24, 'M_FORD_F350', 'F-350 Super Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(536, 'MODEL', 24, 'M_FORD_F450', 'F-450 Super Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(537, 'MODEL', 24, 'M_FORD_F550', 'F-550 Super Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(538, 'MODEL', 24, 'M_FORD_RANG', 'Ranger', NULL, NULL, 1, '2026-04-23 22:50:58'),
(539, 'MODEL', 24, 'M_FORD_TRANS', 'Transit Vagoneta/Cargo', NULL, NULL, 1, '2026-04-23 22:50:58'),
(540, 'MODEL', 24, 'M_FORD_MAV', 'Maverick', NULL, NULL, 1, '2026-04-23 22:50:58'),
(541, 'MODEL', 24, 'M_FORD_EXP', 'Explorer', NULL, NULL, 1, '2026-04-23 22:50:58'),
(542, 'MODEL', 24, 'M_FORD_EXPD', 'Expedition', NULL, NULL, 1, '2026-04-23 22:50:58'),
(543, 'MODEL', 32, 'M_CHV_SIL15', 'Silverado 1500 (Work Truck)', NULL, NULL, 1, '2026-04-23 22:50:58'),
(544, 'MODEL', 32, 'M_CHV_SIL25', 'Silverado 2500', NULL, NULL, 1, '2026-04-23 22:50:58'),
(545, 'MODEL', 32, 'M_CHV_SIL35', 'Silverado 3500', NULL, NULL, 1, '2026-04-23 22:50:58'),
(546, 'MODEL', 32, 'M_CHV_COL', 'Colorado', NULL, NULL, 1, '2026-04-23 22:50:58'),
(547, 'MODEL', 32, 'M_CHV_S10', 'S10 Max', NULL, NULL, 1, '2026-04-23 22:50:58'),
(548, 'MODEL', 32, 'M_CHV_TOR', 'Tornado / Tornado Van', NULL, NULL, 1, '2026-04-23 22:50:58'),
(549, 'MODEL', 32, 'M_CHV_EXP', 'Express Cargo/Pasajeros', NULL, NULL, 1, '2026-04-23 22:50:58'),
(550, 'MODEL', 32, 'M_CHV_SUB', 'Suburban', NULL, NULL, 1, '2026-04-23 22:50:58'),
(551, 'MODEL', 32, 'M_CHV_TAH', 'Tahoe', NULL, NULL, 1, '2026-04-23 22:50:58'),
(552, 'MODEL', 32, 'M_CHV_ONIX', 'Onix', NULL, NULL, 1, '2026-04-23 22:50:58'),
(553, 'MODEL', 32, 'M_CHV_AVEO', 'Aveo', NULL, NULL, 1, '2026-04-23 22:50:58'),
(554, 'MODEL', 32, 'M_CHV_CAP', 'Captiva', NULL, NULL, 1, '2026-04-23 22:50:58'),
(555, 'MODEL', 33, 'M_RAM_700', 'Ram 700', NULL, NULL, 1, '2026-04-23 22:50:58'),
(556, 'MODEL', 33, 'M_RAM_1500', 'Ram 1500', NULL, NULL, 1, '2026-04-23 22:50:58'),
(557, 'MODEL', 33, 'M_RAM_3500', 'Ram 3500 Heavy Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(558, 'MODEL', 33, 'M_RAM_PROM', 'ProMaster', NULL, NULL, 1, '2026-04-23 22:50:58'),
(559, 'MODEL', 33, 'M_RAM_PROR', 'ProMaster Rapid', NULL, NULL, 1, '2026-04-23 22:50:58'),
(562, 'MODEL', 34, 'M_VW_AMR', 'Amarok', NULL, NULL, 1, '2026-04-23 22:50:58'),
(563, 'MODEL', 34, 'M_VW_SAV', 'Saveiro', NULL, NULL, 1, '2026-04-23 22:50:58'),
(564, 'MODEL', 34, 'M_VW_CRA', 'Crafter', NULL, NULL, 1, '2026-04-23 22:50:58'),
(565, 'MODEL', 34, 'M_VW_TRA', 'Transporter / Multivan', NULL, NULL, 1, '2026-04-23 22:50:58'),
(566, 'MODEL', 34, 'M_VW_CAD', 'Caddy Cargo', NULL, NULL, 1, '2026-04-23 22:50:58'),
(567, 'MODEL', 34, 'M_VW_JET', 'Jetta', NULL, NULL, 1, '2026-04-23 22:50:58'),
(568, 'MODEL', 34, 'M_VW_VEN', 'Vento', NULL, NULL, 1, '2026-04-23 22:50:58'),
(569, 'MODEL', 34, 'M_VW_VIR', 'Virtus', NULL, NULL, 1, '2026-04-23 22:50:58'),
(570, 'MODEL', 34, 'M_VW_TAO', 'Taos', NULL, NULL, 1, '2026-04-23 22:50:58'),
(571, 'MODEL', 34, 'M_VW_TIG', 'Tiguan', NULL, NULL, 1, '2026-04-23 22:50:58'),
(572, 'MODEL', 35, 'M_MIT_L200', 'L200 Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(573, 'MODEL', 35, 'M_MIT_OUT', 'Outlander', NULL, NULL, 1, '2026-04-23 22:50:58'),
(574, 'MODEL', 35, 'M_MIT_MON', 'Montero Sport', NULL, NULL, 1, '2026-04-23 22:50:58'),
(575, 'MODEL', 35, 'M_MIT_XPA', 'Xpander', NULL, NULL, 1, '2026-04-23 22:50:58'),
(576, 'MODEL', 35, 'M_MIT_MIR', 'Mirage G4', NULL, NULL, 1, '2026-04-23 22:50:58'),
(577, 'MODEL', 36, 'M_HYU_H100', 'H100 Diésel (Camión Ligero)', NULL, NULL, 1, '2026-04-23 22:50:58'),
(578, 'MODEL', 36, 'M_HYU_STA', 'Starex / Staria', NULL, NULL, 1, '2026-04-23 22:50:58'),
(579, 'MODEL', 36, 'M_HYU_CRE', 'Creta', NULL, NULL, 1, '2026-04-23 22:50:58'),
(580, 'MODEL', 36, 'M_HYU_TUC', 'Tucson', NULL, NULL, 1, '2026-04-23 22:50:58'),
(581, 'MODEL', 36, 'M_HYU_SFE', 'Santa Fe', NULL, NULL, 1, '2026-04-23 22:50:58'),
(582, 'MODEL', 36, 'M_HYU_ELA', 'Elantra', NULL, NULL, 1, '2026-04-23 22:50:58'),
(583, 'MODEL', 36, 'M_HYU_I10', 'Grand i10', NULL, NULL, 1, '2026-04-23 22:50:58'),
(584, 'MODEL', 37, 'M_KIA_K2700', 'K2700 / Bongo (Camión Ligero)', NULL, NULL, 1, '2026-04-23 22:50:58'),
(585, 'MODEL', 37, 'M_KIA_RIO', 'Rio', NULL, NULL, 1, '2026-04-23 22:50:58'),
(586, 'MODEL', 37, 'M_KIA_K3', 'K3', NULL, NULL, 1, '2026-04-23 22:50:58'),
(587, 'MODEL', 37, 'M_KIA_FOR', 'Forte', NULL, NULL, 1, '2026-04-23 22:50:58'),
(588, 'MODEL', 37, 'M_KIA_SPO', 'Sportage', NULL, NULL, 1, '2026-04-23 22:50:58'),
(589, 'MODEL', 37, 'M_KIA_SOR', 'Sorento', NULL, NULL, 1, '2026-04-23 22:50:58'),
(590, 'MODEL', 37, 'M_KIA_SEL', 'Seltos', NULL, NULL, 1, '2026-04-23 22:50:58'),
(591, 'MODEL', 38, 'M_MAZ_BT50', 'BT-50 Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(592, 'MODEL', 38, 'M_MAZ_M3', 'Mazda3', NULL, NULL, 1, '2026-04-23 22:50:58'),
(593, 'MODEL', 38, 'M_MAZ_CX5', 'CX-5', NULL, NULL, 1, '2026-04-23 22:50:58'),
(594, 'MODEL', 38, 'M_MAZ_CX30', 'CX-30', NULL, NULL, 1, '2026-04-23 22:50:58'),
(595, 'MODEL', 39, 'M_MG_5', 'MG5', NULL, NULL, 1, '2026-04-23 22:50:58'),
(596, 'MODEL', 39, 'M_MG_GT', 'MG GT', NULL, NULL, 1, '2026-04-23 22:50:58'),
(597, 'MODEL', 39, 'M_MG_ZS', 'ZS', NULL, NULL, 1, '2026-04-23 22:50:58'),
(598, 'MODEL', 39, 'M_MG_HS', 'HS', NULL, NULL, 1, '2026-04-23 22:50:58'),
(599, 'MODEL', 39, 'M_MG_RX8', 'RX8', NULL, NULL, 1, '2026-04-23 22:50:58'),
(600, 'MODEL', 44, 'M_CHA_HUN', 'Hunter Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(601, 'MODEL', 44, 'M_CHA_ALS', 'Alsvin', NULL, NULL, 1, '2026-04-23 22:50:58'),
(602, 'MODEL', 44, 'M_CHA_CS35', 'CS35 Plus', NULL, NULL, 1, '2026-04-23 22:50:58'),
(603, 'MODEL', 44, 'M_CHA_CS55', 'CS55 Plus', NULL, NULL, 1, '2026-04-23 22:50:58'),
(604, 'MODEL', 45, 'M_KW_T680', 'T680', NULL, NULL, 1, '2026-04-23 22:50:58'),
(605, 'MODEL', 45, 'M_KW_T880', 'T880', NULL, NULL, 1, '2026-04-23 22:50:58'),
(606, 'MODEL', 45, 'M_KW_T370', 'T370', NULL, NULL, 1, '2026-04-23 22:50:58'),
(607, 'MODEL', 45, 'M_KW_T800', 'T800', NULL, NULL, 1, '2026-04-23 22:50:58'),
(608, 'MODEL', 45, 'M_KW_W900', 'W900', NULL, NULL, 1, '2026-04-23 22:50:58'),
(609, 'MODEL', 46, 'M_FR_CAS', 'Cascadia', NULL, NULL, 1, '2026-04-23 22:50:58'),
(610, 'MODEL', 46, 'M_FR_M2106', 'M2 106', NULL, NULL, 1, '2026-04-23 22:50:58'),
(611, 'MODEL', 46, 'M_FR_M2112', 'M2 112', NULL, NULL, 1, '2026-04-23 22:50:58'),
(612, 'MODEL', 46, 'M_FR_COL', 'Columbia', NULL, NULL, 1, '2026-04-23 22:50:58'),
(613, 'MODEL', 47, 'M_IN_LON', 'LoneStar', NULL, NULL, 1, '2026-04-23 22:50:58'),
(614, 'MODEL', 47, 'M_IN_PRO', 'ProStar', NULL, NULL, 1, '2026-04-23 22:50:58'),
(615, 'MODEL', 47, 'M_IN_LT', 'LT Series', NULL, NULL, 1, '2026-04-23 22:50:58'),
(616, 'MODEL', 47, 'M_IN_MV', 'MV Series', NULL, NULL, 1, '2026-04-23 22:50:58'),
(617, 'MODEL', 48, 'M_ISU_E100', 'ELF 100', NULL, NULL, 1, '2026-04-23 22:50:58'),
(618, 'MODEL', 48, 'M_ISU_E200', 'ELF 200', NULL, NULL, 1, '2026-04-23 22:50:58'),
(619, 'MODEL', 48, 'M_ISU_E300', 'ELF 300 / 400', NULL, NULL, 1, '2026-04-23 22:50:58'),
(620, 'MODEL', 48, 'M_ISU_E500', 'ELF 500 / 600', NULL, NULL, 1, '2026-04-23 22:50:58'),
(621, 'MODEL', 48, 'M_ISU_FWD', 'Forward 800 / 1100', NULL, NULL, 1, '2026-04-23 22:50:58'),
(622, 'MODEL', 49, 'M_HIN_S300', 'Serie 300', NULL, NULL, 1, '2026-04-23 22:50:58'),
(623, 'MODEL', 49, 'M_HIN_S500', 'Serie 500', NULL, NULL, 1, '2026-04-23 22:50:58'),
(624, 'MODEL', 50, 'M_MB_SPR', 'Sprinter Cargo/Pasaje', NULL, NULL, 1, '2026-04-23 22:50:58'),
(625, 'MODEL', 50, 'M_MB_VIT', 'Vito', NULL, NULL, 1, '2026-04-23 22:50:58'),
(626, 'MODEL', 50, 'M_MB_ACT', 'Actros', NULL, NULL, 1, '2026-04-23 22:50:58'),
(627, 'MODEL', 50, 'M_MB_ATE', 'Atego', NULL, NULL, 1, '2026-04-23 22:50:58'),
(628, 'MODEL', 51, 'M_SCA_R', 'Serie R', NULL, NULL, 1, '2026-04-23 22:50:58'),
(629, 'MODEL', 51, 'M_SCA_G', 'Serie G', NULL, NULL, 1, '2026-04-23 22:50:58'),
(630, 'MODEL', 51, 'M_SCA_P', 'Serie P', NULL, NULL, 1, '2026-04-23 22:50:58'),
(631, 'MODEL', 51, 'M_SCA_S', 'Serie S', NULL, NULL, 1, '2026-04-23 22:50:58'),
(632, 'MODEL', 52, 'M_VOL_VNL', 'VNL', NULL, NULL, 1, '2026-04-23 22:50:58'),
(633, 'MODEL', 52, 'M_VOL_VNR', 'VNR', NULL, NULL, 1, '2026-04-23 22:50:58'),
(634, 'MODEL', 52, 'M_VOL_FH', 'FH Series', NULL, NULL, 1, '2026-04-23 22:50:58'),
(635, 'MODEL', 52, 'M_VOL_FMX', 'FMX Series', NULL, NULL, 1, '2026-04-23 22:50:58'),
(636, 'MODEL', 253, 'M_TOY_HIL', 'Hilux', NULL, NULL, 1, '2026-04-23 22:50:58'),
(637, 'MODEL', 253, 'M_TOY_TAC', 'Tacoma', NULL, NULL, 1, '2026-04-23 22:50:58'),
(638, 'MODEL', 253, 'M_TOY_TUN', 'Tundra', NULL, NULL, 1, '2026-04-23 22:50:58'),
(639, 'MODEL', 253, 'M_TOY_HIA', 'Hiace Pasajeros/Panel', NULL, NULL, 1, '2026-04-23 22:50:58'),
(640, 'MODEL', 253, 'M_TOY_RAV', 'RAV4', NULL, NULL, 1, '2026-04-23 22:50:58'),
(641, 'MODEL', 253, 'M_TOY_COR', 'Corolla', NULL, NULL, 1, '2026-04-23 22:50:58'),
(642, 'MODEL', 253, 'M_TOY_YAR', 'Yaris', NULL, NULL, 1, '2026-04-23 22:50:58'),
(643, 'MODEL', 253, 'M_TOY_AVA', 'Avanza', NULL, NULL, 1, '2026-04-23 22:50:58'),
(644, 'MODEL', 254, 'M_HON_CRV', 'CR-V', NULL, NULL, 1, '2026-04-23 22:50:58'),
(645, 'MODEL', 254, 'M_HON_HRV', 'HR-V', NULL, NULL, 1, '2026-04-23 22:50:58'),
(646, 'MODEL', 254, 'M_HON_CIV', 'Civic', NULL, NULL, 1, '2026-04-23 22:50:58'),
(647, 'MODEL', 254, 'M_HON_CIT', 'City', NULL, NULL, 1, '2026-04-23 22:50:58'),
(648, 'MODEL', 254, 'M_HON_ACC', 'Accord', NULL, NULL, 1, '2026-04-23 22:50:58'),
(649, 'MODEL', 255, 'M_SUZ_SWI', 'Swift', NULL, NULL, 1, '2026-04-23 22:50:58'),
(650, 'MODEL', 255, 'M_SUZ_IGN', 'Ignis', NULL, NULL, 1, '2026-04-23 22:50:58'),
(651, 'MODEL', 255, 'M_SUZ_VIT', 'Vitara', NULL, NULL, 1, '2026-04-23 22:50:58'),
(652, 'MODEL', 255, 'M_SUZ_ERT', 'Ertiga', NULL, NULL, 1, '2026-04-23 22:50:58'),
(653, 'MODEL', 256, 'M_JAC_FT6', 'Frison T6', NULL, NULL, 1, '2026-04-23 22:50:58'),
(654, 'MODEL', 256, 'M_JAC_FT8', 'Frison T8', NULL, NULL, 1, '2026-04-23 22:50:58'),
(655, 'MODEL', 256, 'M_JAC_SUN', 'Sunray Carga', NULL, NULL, 1, '2026-04-23 22:50:58'),
(656, 'MODEL', 256, 'M_JAC_J7', 'J7', NULL, NULL, 1, '2026-04-23 22:50:58'),
(657, 'MODEL', 256, 'M_JAC_SEI2', 'Sei2', NULL, NULL, 1, '2026-04-23 22:50:58'),
(658, 'MODEL', 257, 'M_BYD_DOL', 'Dolphin', NULL, NULL, 1, '2026-04-23 22:50:58'),
(659, 'MODEL', 257, 'M_BYD_SEA', 'Seal', NULL, NULL, 1, '2026-04-23 22:50:58'),
(660, 'MODEL', 257, 'M_BYD_YUA', 'Yuan Plus', NULL, NULL, 1, '2026-04-23 22:50:58'),
(661, 'MODEL', 257, 'M_BYD_SHA', 'Shark Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(662, 'MODEL', 258, 'M_CHI_T2', 'Tiggo 2 Pro', NULL, NULL, 1, '2026-04-23 22:50:58'),
(663, 'MODEL', 258, 'M_CHI_T4', 'Tiggo 4 Pro', NULL, NULL, 1, '2026-04-23 22:50:58'),
(664, 'MODEL', 258, 'M_CHI_T7', 'Tiggo 7 Pro', NULL, NULL, 1, '2026-04-23 22:50:58'),
(665, 'MODEL', 258, 'M_CHI_A8', 'Arrizo 8', NULL, NULL, 1, '2026-04-23 22:50:58'),
(666, 'MODEL', 259, 'M_OMO_O5', 'Omoda O5', NULL, NULL, 1, '2026-04-23 22:50:58'),
(667, 'MODEL', 259, 'M_OMO_C5', 'Omoda C5', NULL, NULL, 1, '2026-04-23 22:50:58'),
(668, 'MODEL', 260, 'M_GWM_POE', 'Poer Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(669, 'MODEL', 260, 'M_GWM_H6', 'Haval H6', NULL, NULL, 1, '2026-04-23 22:50:58'),
(670, 'MODEL', 260, 'M_GWM_JOL', 'Haval Jolion', NULL, NULL, 1, '2026-04-23 22:50:58'),
(671, 'MODEL', 261, 'M_SHA_X3K', 'X3000', NULL, NULL, 1, '2026-04-23 22:50:58'),
(672, 'MODEL', 261, 'M_SHA_L3K', 'L3000', NULL, NULL, 1, '2026-04-23 22:50:58'),
(673, 'MODEL', 262, 'M_SIT_C7H', 'C7H', NULL, NULL, 1, '2026-04-23 22:50:58'),
(674, 'MODEL', 262, 'M_SIT_T5G', 'T5G', NULL, NULL, 1, '2026-04-23 22:50:58'),
(675, 'MODEL', 263, 'M_FOT_AUM', 'Auman', NULL, NULL, 1, '2026-04-23 22:50:58'),
(676, 'MODEL', 263, 'M_FOT_TUN', 'Tunland Pick Up', NULL, NULL, 1, '2026-04-23 22:50:58'),
(677, 'MODEL', 263, 'M_FOT_VIEW', 'View CS2', NULL, NULL, 1, '2026-04-23 22:50:58'),
(678, 'MODEL', 263, 'M_FOT_TOA', 'Toano Cargo', NULL, NULL, 1, '2026-04-23 22:50:58'),
(679, 'MODEL', 413, 'M_GMC_SIE', 'Sierra 1500 / HD', NULL, NULL, 1, '2026-04-23 22:50:58'),
(680, 'MODEL', 413, 'M_GMC_CAN', 'Canyon', NULL, NULL, 1, '2026-04-23 22:50:58'),
(681, 'MODEL', 413, 'M_GMC_YUK', 'Yukon', NULL, NULL, 1, '2026-04-23 22:50:58'),
(682, 'MODEL', 413, 'M_GMC_TER', 'Terrain', NULL, NULL, 1, '2026-04-23 22:50:58'),
(683, 'MODEL', 414, 'M_JEE_WRA', 'Wrangler', NULL, NULL, 1, '2026-04-23 22:50:58'),
(684, 'MODEL', 414, 'M_JEE_GC', 'Grand Cherokee', NULL, NULL, 1, '2026-04-23 22:50:58'),
(685, 'MODEL', 414, 'M_JEE_COM', 'Compass', NULL, NULL, 1, '2026-04-23 22:50:58'),
(686, 'MODEL', 414, 'M_JEE_REN', 'Renegade', NULL, NULL, 1, '2026-04-23 22:50:58'),
(687, 'MODEL', 414, 'M_JEE_GLA', 'Gladiator', NULL, NULL, 1, '2026-04-23 22:50:58'),
(688, 'MODEL', 415, 'M_CAD_ESC', 'Escalade', NULL, NULL, 1, '2026-04-23 22:50:58'),
(689, 'MODEL', 415, 'M_CAD_XT4', 'XT4', NULL, NULL, 1, '2026-04-23 22:50:58'),
(690, 'MODEL', 415, 'M_CAD_XT5', 'XT5', NULL, NULL, 1, '2026-04-23 22:50:58'),
(691, 'MODEL', 416, 'M_BUI_ENC', 'Encore', NULL, NULL, 1, '2026-04-23 22:50:58'),
(692, 'MODEL', 416, 'M_BUI_ENV', 'Envision', NULL, NULL, 1, '2026-04-23 22:50:58'),
(693, 'MODEL', 416, 'M_BUI_ENCL', 'Enclave', NULL, NULL, 1, '2026-04-23 22:50:58'),
(694, 'MODEL', 417, 'M_PET_389', 'Model 389', NULL, NULL, 1, '2026-04-23 22:50:58'),
(695, 'MODEL', 417, 'M_PET_579', 'Model 579', NULL, NULL, 1, '2026-04-23 22:50:58'),
(696, 'MODEL', 417, 'M_PET_337', 'Model 337 / Medium Duty', NULL, NULL, 1, '2026-04-23 22:50:58'),
(697, 'MODEL', 418, 'M_MAC_ANT', 'Anthem', NULL, NULL, 1, '2026-04-23 22:50:58'),
(698, 'MODEL', 418, 'M_MAC_PIN', 'Pinnacle', NULL, NULL, 1, '2026-04-23 22:50:58'),
(699, 'MODEL', 418, 'M_MAC_GRA', 'Granite', NULL, NULL, 1, '2026-04-23 22:50:58'),
(705, 'MODEL', 438, 'M_KOM_WA380', 'Cargador WA380', NULL, NULL, 1, '2026-04-23 22:50:58'),
(708, 'MODEL', 28, 'M_JD_310', 'Retroexcavadora 310L', NULL, NULL, 1, '2026-04-23 22:50:58'),
(709, 'MODEL', 28, 'M_JD_210', 'Excavadora 210G', NULL, NULL, 1, '2026-04-23 22:50:58'),
(710, 'MODEL', 434, 'M_JD_624', 'Cargador 624P', NULL, NULL, 1, '2026-04-23 22:50:58'),
(711, 'FLEET_OWNER', NULL, 'OWN_AS', 'Arian Silver de México', NULL, NULL, 1, '2026-04-26 22:27:34'),
(712, 'FLEET_OWNER', NULL, 'OWN_HU', 'Huur', NULL, NULL, 1, '2026-04-26 22:27:34'),
(713, 'COMPLIANCE_STATUS', NULL, 'CS_OK', 'Completo / Operativo', NULL, NULL, 1, '2026-04-26 22:27:34'),
(714, 'COMPLIANCE_STATUS', NULL, 'CS_WARN', 'Incompleto / Observación', NULL, NULL, 1, '2026-04-26 22:27:34'),
(715, 'COMPLIANCE_STATUS', NULL, 'CS_ERR', 'No Disponible / Crítico', NULL, NULL, 1, '2026-04-26 22:27:34'),
(726, 'BRAND', 2, 'B_SANDVIK', 'Sandvik (Mining)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(727, 'BRAND', 2, 'B_EPIROC', 'Epiroc', NULL, NULL, 1, '2026-04-26 23:21:06'),
(728, 'BRAND', 2, 'B_FLSMIDTH', 'FLSmidth (Planta)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(729, 'BRAND', 2, 'B_WARMAN', 'Warman (Bombas Slurry)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(730, 'BRAND', 2, 'B_NORMET', 'Normet (Socavón)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(731, 'BRAND', 2, 'B_GETMAN', 'Getman (Logística UG)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(732, 'BRAND', 2, 'B_WACKER', 'Wacker Neuson', NULL, NULL, 1, '2026-04-26 23:21:06'),
(733, 'BRAND', 2, 'B_ATLAS_C', 'Atlas Copco', NULL, NULL, 1, '2026-04-26 23:21:06'),
(734, 'BRAND', 2, 'B_LIEBHERR', 'Liebherr', NULL, NULL, 1, '2026-04-26 23:21:06'),
(735, 'BRAND', 2, 'B_HITACHI', 'Hitachi Construction', NULL, NULL, 1, '2026-04-26 23:21:06'),
(736, 'BRAND', 3, 'B_THERMO', 'Thermo Scientific (Lab)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(737, 'BRAND', 3, 'B_ENERPAC', 'Enerpac (Hidráulica)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(738, 'BRAND', 3, 'B_HYTORC', 'Hytorc (Torque)', NULL, NULL, 1, '2026-04-26 23:21:06'),
(739, 'BRAND', 3, 'B_MSA', 'MSA Safety', NULL, NULL, 1, '2026-04-26 23:21:06'),
(740, 'BRAND', 3, 'B_DRAEGER', 'Draeger', NULL, NULL, 1, '2026-04-26 23:21:06'),
(741, 'BRAND', 3, 'B_LEICA', 'Leica Geosystems', NULL, NULL, 1, '2026-04-26 23:21:06'),
(742, 'BRAND', 3, 'B_TRIMBLE', 'Trimble', NULL, NULL, 1, '2026-04-26 23:21:06'),
(743, 'BRAND', 3, 'B_RIDGID', 'Ridgid', NULL, NULL, 1, '2026-04-26 23:21:06'),
(744, 'BRAND', 3, 'B_FLUKE', 'Fluke', NULL, NULL, 1, '2026-04-26 23:21:06'),
(747, 'MODEL', 255, 'M_SUZ_JIM_3D', 'Jimny 3-Door', NULL, NULL, 1, '2026-04-26 23:21:06'),
(750, 'MODEL', 726, 'SAN_DD421', 'Jumbo DD421', NULL, NULL, 1, '2026-04-26 23:21:06'),
(751, 'MODEL', 726, 'SAN_LH517', 'Scooptram LH517', NULL, NULL, 1, '2026-04-26 23:21:06'),
(752, 'MODEL', 727, 'EPI_S7', 'Boomer S7', NULL, NULL, 1, '2026-04-26 23:21:06'),
(753, 'MODEL', 727, 'EPI_MT65', 'Minetruck MT65', NULL, NULL, 1, '2026-04-26 23:21:06'),
(754, 'MODEL', 28, 'CAT_777', 'Camión 777G', NULL, NULL, 1, '2026-04-26 23:21:06'),
(755, 'MODEL', 28, 'CAT_992', 'Cargador 992', NULL, NULL, 1, '2026-04-26 23:21:06'),
(756, 'MODEL', 728, 'FLS_SAG', 'Molino SAG', NULL, NULL, 1, '2026-04-26 23:21:06'),
(757, 'MODEL', 728, 'FLS_BALL', 'Molino de Bolas', NULL, NULL, 1, '2026-04-26 23:21:06'),
(758, 'MODEL', 729, 'WAR_AH', 'Bomba Warman AH', NULL, NULL, 1, '2026-04-26 23:21:06'),
(759, 'MODEL', 729, 'WAR_MC', 'Bomba MC', NULL, NULL, 1, '2026-04-26 23:21:06'),
(760, 'MODEL', 736, 'THE_NITON', 'Analizador XRF Niton XL5', NULL, NULL, 1, '2026-04-26 23:21:06'),
(761, 'MODEL', 741, 'LEI_TS07', 'Estación Total TS07', NULL, NULL, 1, '2026-04-26 23:21:06'),
(763, 'MODEL', 730, 'NOR_SPRAY', 'Spraymec', NULL, NULL, 1, '2026-04-26 23:21:06'),
(764, 'MODEL', 730, 'NOR_CHARG', 'Charmec', NULL, NULL, 1, '2026-04-26 23:21:06'),
(765, 'MODEL', 738, 'HYT_STE', 'Llave Stealth', NULL, NULL, 1, '2026-04-26 23:21:06'),
(766, 'MODEL', 737, 'ENE_RC', 'Cilindro RC', NULL, NULL, 1, '2026-04-26 23:21:06'),
(767, 'MODEL', 737, 'ENE_P80', 'Bomba P80', NULL, NULL, 1, '2026-04-26 23:21:06'),
(774, 'MODEL', 733, 'ATL_XAS185', 'Compresor XAS 185', NULL, NULL, 1, '2026-04-26 23:28:56'),
(775, 'MODEL', 733, 'ATL_TEX20', 'Rompedor TEX 20', NULL, NULL, 1, '2026-04-26 23:28:56'),
(776, 'MODEL', 444, 'BOS_GWS7', 'Esmeriladora GWS 7', NULL, NULL, 1, '2026-04-26 23:28:56'),
(777, 'MODEL', 444, 'BOS_GBH2', 'Rotomartillo GBH 2', NULL, NULL, 1, '2026-04-26 23:28:56'),
(778, 'BRAND', 3, 'B_STIHL', 'STIHL', NULL, NULL, 1, '2026-04-26 23:30:53'),
(779, 'MODEL', 778, 'STI_TS420', 'Cortadora de Disco TS 420', NULL, NULL, 1, '2026-04-26 23:30:53'),
(780, 'MODEL', 778, 'STI_TS800', 'Cortadora de Disco TS 800', NULL, NULL, 1, '2026-04-26 23:30:53'),
(781, 'MODEL', 778, 'STI_MS260', 'Motosierra MS 260', NULL, NULL, 1, '2026-04-26 23:30:53'),
(782, 'MODEL', 778, 'STI_MS382', 'Motosierra MS 382', NULL, NULL, 1, '2026-04-26 23:30:53'),
(783, 'MODEL', 778, 'STI_MS661', 'Motosierra Magnum MS 661', NULL, NULL, 1, '2026-04-26 23:30:53'),
(784, 'MODEL', 778, 'STI_FS450', 'Desbrozadora FS 450 (Maleza Pesada)', NULL, NULL, 1, '2026-04-26 23:30:53'),
(785, 'MODEL', 778, 'STI_FS55', 'Desbrozadora FS 55', NULL, NULL, 1, '2026-04-26 23:30:53'),
(786, 'MODEL', 778, 'STI_BR600', 'Sopladora de Mochila BR 600', NULL, NULL, 1, '2026-04-26 23:30:53'),
(787, 'MODEL', 778, 'STI_RB600', 'Hidrolavadora Industrial RB 600', NULL, NULL, 1, '2026-04-26 23:30:53'),
(788, 'BRAND', 2, 'B_MILLER', 'Miller Electric', NULL, NULL, 1, '2026-04-26 23:33:27'),
(789, 'BRAND', 2, 'B_LINCOLN', 'Lincoln Electric', NULL, NULL, 1, '2026-04-26 23:33:27'),
(790, 'BRAND', 2, 'B_IR', 'Ingersoll Rand', NULL, NULL, 1, '2026-04-26 23:33:27'),
(791, 'BRAND', 2, 'B_SULLAIR', 'Sullair', NULL, NULL, 1, '2026-04-26 23:33:27'),
(792, 'BRAND', 2, 'B_MANITOU', 'Manitou', NULL, NULL, 1, '2026-04-26 23:33:27'),
(793, 'BRAND', 2, 'B_JLG', 'JLG', NULL, NULL, 1, '2026-04-26 23:33:27'),
(794, 'BRAND', 2, 'B_GENIE', 'Genie', NULL, NULL, 1, '2026-04-26 23:33:27'),
(795, 'BRAND', 2, 'B_GODWIN', 'Godwin (Xylem)', NULL, NULL, 1, '2026-04-26 23:33:27'),
(796, 'BRAND', 2, 'B_WILDEN', 'Wilden', NULL, NULL, 1, '2026-04-26 23:33:27'),
(810, 'MODEL', 788, 'MIL_BB400', 'Big Blue 400 Pro (Diesel)', NULL, NULL, 1, '2026-04-26 23:33:27'),
(811, 'MODEL', 788, 'MIL_TB325', 'Trailblazer 325', NULL, NULL, 1, '2026-04-26 23:33:27'),
(812, 'MODEL', 788, 'MIL_MM252', 'Millermatic 252 (MIG)', NULL, NULL, 1, '2026-04-26 23:33:27'),
(816, 'MODEL', 789, 'LIN_V400', 'Vantage 400 (Diesel)', NULL, NULL, 1, '2026-04-26 23:33:27'),
(817, 'MODEL', 789, 'LIN_R250', 'Ranger 250 GXT', NULL, NULL, 1, '2026-04-26 23:33:27'),
(820, 'MODEL', 790, 'IR_P185', 'Compresor Portátil P185WD', NULL, NULL, 1, '2026-04-26 23:33:27'),
(821, 'MODEL', 790, 'IR_2850MAX', 'Impacto 1\" 2850MAX-6', NULL, NULL, 1, '2026-04-26 23:33:27'),
(822, 'MODEL', 790, 'IR_2145QI', 'Impacto 3/4\" 2145Qi', NULL, NULL, 1, '2026-04-26 23:33:27'),
(826, 'MODEL', 791, 'SUL_185', 'Compresor 185 T4F', NULL, NULL, 1, '2026-04-26 23:33:27'),
(827, 'MODEL', 791, 'SUL_375', 'Compresor 375 High Pressure', NULL, NULL, 1, '2026-04-26 23:33:27'),
(830, 'MODEL', 792, 'MAN_MT1840', 'Telehandler MT 1840', NULL, NULL, 1, '2026-04-26 23:33:27'),
(831, 'MODEL', 792, 'MAN_MRT2550', 'Giratorio MRT 2550', NULL, NULL, 1, '2026-04-26 23:33:27'),
(834, 'MODEL', 793, 'JLG_860SJ', 'Plataforma Telescópica 860SJ', NULL, NULL, 1, '2026-04-26 23:33:27'),
(835, 'MODEL', 793, 'JLG_1930ES', 'Elevador de Tijera 1930ES', NULL, NULL, 1, '2026-04-26 23:33:27'),
(838, 'MODEL', 794, 'GEN_Z45', 'Brazo Articulado Z-45/25', NULL, NULL, 1, '2026-04-26 23:33:27'),
(839, 'MODEL', 794, 'GEN_S65', 'Brazo Telescópico S-65', NULL, NULL, 1, '2026-04-26 23:33:27'),
(842, 'MODEL', 795, 'GOD_HL250M', 'Bomba de Alta Presión HL250M', NULL, NULL, 1, '2026-04-26 23:33:27'),
(843, 'MODEL', 795, 'GOD_CD150M', 'Bomba Autocebante CD150M', NULL, NULL, 1, '2026-04-26 23:33:27'),
(846, 'MODEL', 796, 'WIL_P8', 'Bomba de Diafragma Pro-Flo P8', NULL, NULL, 1, '2026-04-26 23:33:27'),
(848, 'MODEL', 743, 'RID_300', 'Roscadora de Tubería 300', NULL, NULL, 1, '2026-04-26 23:33:27'),
(849, 'MODEL', 743, 'RID_WRENCH', 'Llave de Grifa 24\" - 48\"', NULL, NULL, 1, '2026-04-26 23:33:27'),
(852, 'BRAND', 1, 'B_SEAT', 'Seat', NULL, NULL, 1, '2026-04-26 23:42:18'),
(855, 'MODEL', 852, 'M_SEA_ATE', 'Ateca', NULL, NULL, 1, '2026-04-26 23:42:18'),
(856, 'MODEL', 256, 'M_JAC_X200', 'X200 (Camión Ligero)', NULL, NULL, 1, '2026-04-26 23:42:18'),
(861, 'MODEL', 32, 'M_CHV_CHEY', 'Cheyenne (RST / Trail Boss / ZR2)', NULL, NULL, 1, '2026-04-26 23:48:19'),
(862, 'MODEL', 32, 'M_CHV_SIL_HD2', 'Silverado 2500 HD', NULL, NULL, 1, '2026-04-26 23:48:19'),
(863, 'MODEL', 32, 'M_CHV_SIL_HD3', 'Silverado 3500 HD', NULL, NULL, 1, '2026-04-26 23:48:19'),
(864, 'MODEL', 32, 'M_CHV_SIL_CHAS', 'Silverado 3500 Chasis Cabina', NULL, NULL, 1, '2026-04-26 23:48:19'),
(865, 'MODEL', 32, 'M_CHV_LCF_3500', 'Low Cab Forward 3500', NULL, NULL, 1, '2026-04-26 23:48:19'),
(866, 'MODEL', 32, 'M_CHV_LCF_4500', 'Low Cab Forward 4500', NULL, NULL, 1, '2026-04-26 23:48:19'),
(867, 'MODEL', 32, 'M_CHV_LCF_5500', 'Low Cab Forward 5500', NULL, NULL, 1, '2026-04-26 23:48:19'),
(868, 'MODEL', 32, 'M_CHV_TRAK', 'Tracker', NULL, NULL, 1, '2026-04-26 23:48:19'),
(869, 'MODEL', 32, 'M_CHV_TRAX', 'Trax', NULL, NULL, 1, '2026-04-26 23:48:19'),
(870, 'MODEL', 32, 'M_CHV_GROO', 'Groove', NULL, NULL, 1, '2026-04-26 23:48:19'),
(871, 'MODEL', 32, 'M_CHV_MONT', 'Montana (Pick-up Compacta)', NULL, NULL, 1, '2026-04-26 23:48:19'),
(872, 'MODEL', 32, 'M_CHV_EQU', 'Equinox', NULL, NULL, 1, '2026-04-26 23:48:19'),
(873, 'MODEL', 32, 'M_CHV_TRAV', 'Traverse', NULL, NULL, 1, '2026-04-26 23:48:19'),
(874, 'MODEL', 32, 'M_CHV_BLAZ', 'Blazer', NULL, NULL, 1, '2026-04-26 23:48:19'),
(875, 'MODEL', 24, 'M_FORD_TERR', 'Territory', NULL, NULL, 1, '2026-04-26 23:50:01'),
(876, 'MODEL', 24, 'M_FORD_BRON_S', 'Bronco Sport', NULL, NULL, 1, '2026-04-26 23:50:01'),
(877, 'MODEL', 24, 'M_FORD_BRON_H', 'Bronco (Heritage / Wildtrak)', NULL, NULL, 1, '2026-04-26 23:50:01'),
(878, 'MODEL', 24, 'M_FORD_EDGE', 'Edge', NULL, NULL, 1, '2026-04-26 23:50:01'),
(879, 'MODEL', 24, 'M_FORD_ESCA', 'Escape', NULL, NULL, 1, '2026-04-26 23:50:01'),
(880, 'MODEL', 24, 'M_FORD_MACH_E', 'Mustang Mach-E (Eléctrico)', NULL, NULL, 1, '2026-04-26 23:50:01'),
(881, 'MODEL', 24, 'M_FORD_MUST', 'Mustang (GT / Dark Horse)', NULL, NULL, 1, '2026-04-26 23:50:01'),
(882, 'MODEL', 24, 'M_FORD_CHAS_HD', 'F-Series Chasis Cabina (F-350/450/550)', NULL, NULL, 1, '2026-04-26 23:50:01'),
(883, 'MODEL', 24, 'M_FORD_E_TRANS', 'E-Transit (Eléctrica)', NULL, NULL, 1, '2026-04-26 23:50:01'),
(884, 'MODEL', 24, 'M_FORD_FIGO', 'Figo', NULL, NULL, 1, '2026-04-26 23:50:01'),
(885, 'MODEL', 24, 'M_FORD_ECOS', 'EcoSport', NULL, NULL, 1, '2026-04-26 23:50:01'),
(886, 'MODEL', 256, 'M_JAC_FT9', 'Frison T9 (Insignia)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(887, 'MODEL', 256, 'M_JAC_SEI4P', 'Sei4 Pro', NULL, NULL, 1, '2026-04-26 23:51:14'),
(888, 'MODEL', 256, 'M_JAC_SEI6P', 'Sei6 Pro', NULL, NULL, 1, '2026-04-26 23:51:14'),
(889, 'MODEL', 256, 'M_JAC_SEI7P', 'Sei7 Pro', NULL, NULL, 1, '2026-04-26 23:51:14'),
(890, 'MODEL', 256, 'M_JAC_E10X', 'E10X (Eléctrico Urbano)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(891, 'MODEL', 256, 'M_JAC_EJ7', 'E J7 (Eléctrico)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(892, 'MODEL', 256, 'M_JAC_ESUN', 'E Sunray (Eléctrica de Carga)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(893, 'MODEL', 256, 'M_JAC_EX450', 'E X450 (Camión Eléctrico)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(894, 'MODEL', 256, 'M_JAC_X250', 'X250 (Camión Ligero)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(895, 'MODEL', 256, 'M_JAC_X350', 'X350 (Camión Mediano)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(896, 'MODEL', 256, 'M_JAC_X450', 'X450 (Camión de Carga)', NULL, NULL, 1, '2026-04-26 23:51:14'),
(897, 'MODEL', 640, 'M_KIA_K3C', 'K3 Cross', NULL, NULL, 1, '2026-04-27 00:05:31'),
(898, 'MODEL', 640, 'M_KIA_SELT', 'Seltos', NULL, NULL, 1, '2026-04-27 00:05:31'),
(899, 'MODEL', 640, 'M_KIA_EV6', 'EV6 (Eléctrico High-Performance)', NULL, NULL, 1, '2026-04-27 00:05:31'),
(900, 'MODEL', 640, 'M_KIA_NIRO', 'Niro (Híbrido / EV)', NULL, NULL, 1, '2026-04-27 00:05:31'),
(902, 'MODEL', 631, 'M_MIT_L200_25', 'L200 (Nueva Generación 2025)', NULL, NULL, 1, '2026-04-27 00:05:31'),
(903, 'MODEL', 631, 'M_MIT_XPAND', 'Xpander', NULL, NULL, 1, '2026-04-27 00:05:31'),
(904, 'MODEL', 631, 'M_MIT_XPAND_C', 'Xpander Cross', NULL, NULL, 1, '2026-04-27 00:05:31'),
(905, 'MODEL', 631, 'M_MIT_OUT_PHEV', 'Outlander PHEV (Híbrida Enchufable)', NULL, NULL, 1, '2026-04-27 00:05:31'),
(947, 'TIRE_BRAND', NULL, 'TB_NA', 'No Aplica', NULL, NULL, 1, '2026-04-27 00:23:20'),
(948, 'FREQ_USAGE', NULL, 'U_KM_5K', '5,000 KM', 5000.00, 'km', 1, '2026-04-27 00:35:23'),
(949, 'FREQ_USAGE', NULL, 'U_KM_10K', '10,000 KM', 10000.00, 'km', 1, '2026-04-27 00:35:23'),
(950, 'FREQ_USAGE', NULL, 'U_KM_15K', '15,000 KM', 15000.00, 'km', 1, '2026-04-27 00:35:23'),
(951, 'FREQ_USAGE', NULL, 'U_KM_20K', '20,000 KM', 20000.00, 'km', 1, '2026-04-27 00:35:23'),
(952, 'FREQ_USAGE', NULL, 'U_KM_25K', '25,000 KM', 25000.00, 'km', 1, '2026-04-27 00:35:23'),
(953, 'FREQ_USAGE', NULL, 'U_KM_30K', '30,000 KM', 30000.00, 'km', 1, '2026-04-27 00:35:23'),
(954, 'FREQ_USAGE', NULL, 'U_KM_35K', '35,000 KM', 35000.00, 'km', 1, '2026-04-27 00:35:23'),
(955, 'FREQ_USAGE', NULL, 'U_KM_40K', '40,000 KM', 40000.00, 'km', 1, '2026-04-27 00:35:23'),
(956, 'FREQ_USAGE', NULL, 'U_KM_45K', '45,000 KM', 45000.00, 'km', 1, '2026-04-27 00:35:23'),
(957, 'FREQ_USAGE', NULL, 'U_KM_50K', '50,000 KM', 50000.00, 'km', 1, '2026-04-27 00:35:23'),
(958, 'FREQ_USAGE', NULL, 'U_KM_55K', '55,000 KM', 55000.00, 'km', 1, '2026-04-27 00:35:23'),
(959, 'FREQ_USAGE', NULL, 'U_KM_60K', '60,000 KM', 60000.00, 'km', 1, '2026-04-27 00:35:23'),
(960, 'FREQ_USAGE', NULL, 'U_KM_65K', '65,000 KM', 65000.00, 'km', 1, '2026-04-27 00:35:23'),
(961, 'FREQ_USAGE', NULL, 'U_KM_70K', '70,000 KM', 70000.00, 'km', 1, '2026-04-27 00:35:23'),
(962, 'FREQ_USAGE', NULL, 'U_KM_75K', '75,000 KM', 75000.00, 'km', 1, '2026-04-27 00:35:23'),
(963, 'FREQ_USAGE', NULL, 'U_KM_80K', '80,000 KM', 80000.00, 'km', 1, '2026-04-27 00:35:23'),
(964, 'FREQ_USAGE', NULL, 'U_KM_85K', '85,000 KM', 85000.00, 'km', 1, '2026-04-27 00:35:23'),
(965, 'FREQ_USAGE', NULL, 'U_KM_90K', '90,000 KM', 90000.00, 'km', 1, '2026-04-27 00:35:23'),
(966, 'FREQ_USAGE', NULL, 'U_KM_95K', '95,000 KM', 95000.00, 'km', 1, '2026-04-27 00:35:23'),
(967, 'FREQ_USAGE', NULL, 'U_KM_100K', '100,000 KM', 100000.00, 'km', 1, '2026-04-27 00:35:23'),
(968, 'FREQ_USAGE', NULL, 'U_HRS_50', '50 HRS', 50.00, 'hrs', 1, '2026-04-27 00:35:23'),
(969, 'FREQ_USAGE', NULL, 'U_HRS_100', '100 HRS', 100.00, 'hrs', 1, '2026-04-27 00:35:23'),
(970, 'FREQ_USAGE', NULL, 'U_HRS_150', '150 HRS', 150.00, 'hrs', 1, '2026-04-27 00:35:23'),
(971, 'FREQ_USAGE', NULL, 'U_HRS_200', '200 HRS', 200.00, 'hrs', 1, '2026-04-27 00:35:23'),
(972, 'FREQ_USAGE', NULL, 'U_HRS_250', '250 HRS', 250.00, 'hrs', 1, '2026-04-27 00:35:23'),
(973, 'FREQ_USAGE', NULL, 'U_HRS_300', '300 HRS', 300.00, 'hrs', 1, '2026-04-27 00:35:23'),
(974, 'FREQ_USAGE', NULL, 'U_HRS_350', '350 HRS', 350.00, 'hrs', 1, '2026-04-27 00:35:23'),
(975, 'FREQ_USAGE', NULL, 'U_HRS_400', '400 HRS', 400.00, 'hrs', 1, '2026-04-27 00:35:23'),
(976, 'FREQ_USAGE', NULL, 'U_HRS_450', '450 HRS', 450.00, 'hrs', 1, '2026-04-27 00:35:23'),
(977, 'FREQ_USAGE', NULL, 'U_HRS_500', '500 HRS', 500.00, 'hrs', 1, '2026-04-27 00:35:23'),
(978, 'FREQ_USAGE', NULL, 'U_HRS_550', '550 HRS', 550.00, 'hrs', 1, '2026-04-27 00:35:23'),
(979, 'FREQ_USAGE', NULL, 'U_HRS_600', '600 HRS', 600.00, 'hrs', 1, '2026-04-27 00:35:23'),
(980, 'FREQ_USAGE', NULL, 'U_HRS_650', '650 HRS', 650.00, 'hrs', 1, '2026-04-27 00:35:23'),
(981, 'FREQ_USAGE', NULL, 'U_HRS_700', '700 HRS', 700.00, 'hrs', 1, '2026-04-27 00:35:23'),
(982, 'FREQ_USAGE', NULL, 'U_HRS_750', '750 HRS', 750.00, 'hrs', 1, '2026-04-27 00:35:23'),
(983, 'FREQ_USAGE', NULL, 'U_HRS_800', '800 HRS', 800.00, 'hrs', 1, '2026-04-27 00:35:23'),
(984, 'FREQ_USAGE', NULL, 'U_HRS_850', '850 HRS', 850.00, 'hrs', 1, '2026-04-27 00:35:23'),
(985, 'FREQ_USAGE', NULL, 'U_HRS_900', '900 HRS', 900.00, 'hrs', 1, '2026-04-27 00:35:23'),
(986, 'FREQ_USAGE', NULL, 'U_HRS_950', '950 HRS', 950.00, 'hrs', 1, '2026-04-27 00:35:23'),
(987, 'FREQ_USAGE', NULL, 'U_HRS_1000', '1,000 HRS', 1000.00, 'hrs', 1, '2026-04-27 00:35:23'),
(988, 'FREQ_TIME', NULL, 'T_ANUAL', 'Anual', 365.00, 'days', 1, '2026-04-27 00:42:44'),
(995, 'USER_ROLE', NULL, 'R_AUDIT', 'Auditor', 1.00, NULL, 1, '2026-04-27 04:04:57'),
(996, 'USER_ROLE', NULL, 'R_ARCHON', 'Archon', 10.00, NULL, 1, '2026-04-27 04:04:57'),
(997, 'USER_ROLE', NULL, 'R_ADMIN', 'Administrador', 20.00, NULL, 1, '2026-04-27 04:04:57'),
(998, 'USER_ROLE', NULL, 'R_OPER', 'Operador', 30.00, NULL, 1, '2026-04-27 04:04:57'),
(999, 'USER_ROLE', NULL, 'R_TECH', 'Técnico', 40.00, NULL, 1, '2026-04-27 04:04:57'),
(1000, 'VEHICLE_COLOR', NULL, 'COL_BLANCO', 'Blanco', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1001, 'VEHICLE_COLOR', NULL, 'COL_NEGRO', 'Negro', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1002, 'VEHICLE_COLOR', NULL, 'COL_GRIS', 'Gris', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1003, 'VEHICLE_COLOR', NULL, 'COL_ROJO', 'Rojo', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1004, 'VEHICLE_COLOR', NULL, 'COL_AZUL', 'Azul', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1005, 'VEHICLE_COLOR', NULL, 'COL_VERDE', 'Verde', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1006, 'VEHICLE_COLOR', NULL, 'COL_AMARILLO', 'Amarillo', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1007, 'VEHICLE_COLOR', NULL, 'COL_NARANJA', 'Naranja', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1008, 'VEHICLE_COLOR', NULL, 'COL_CAFE', 'Café', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1009, 'VEHICLE_COLOR', NULL, 'COL_BEIGE', 'Beige', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1010, 'VEHICLE_COLOR', NULL, 'COL_PLATEADO', 'Plateado', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1011, 'VEHICLE_COLOR', NULL, 'COL_DORADO', 'Dorado', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1012, 'MAINTENANCE_CENTER', NULL, 'MC_PIIC', 'PIIC', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1013, 'MAINTENANCE_CENTER', NULL, 'MC_ARCHON_CORE', 'Archon Core', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1015, 'ROUTE_ORIGIN', NULL, 'ORG_ARIAN_ZAC', 'Arian Silver Zacatecas', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1016, 'ROUTE_ORIGIN', NULL, 'ORG_PLANTA_ZAC', 'Planta Beneficio Zacatecas', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1017, 'ROUTE_ORIGIN', NULL, 'ORG_MINA_ZAC', 'Mina San José', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1018, 'INSURANCE_COMPANY', NULL, 'INS_AXA', 'AXA Seguros', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1019, 'INSURANCE_COMPANY', NULL, 'INS_QUALITAS', 'Qualitas', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1020, 'INSURANCE_COMPANY', NULL, 'INS_GNP', 'GNP Seguros', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1021, 'INSURANCE_COMPANY', NULL, 'INS_CHUBB', 'Chubb', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1022, 'INSURANCE_COMPANY', NULL, 'INS_BANORTE', 'Seguros Banorte', NULL, NULL, 1, '2026-04-27 04:26:43'),
(1023, 'MODEL', 33, 'M_RAM_4000', 'RAM 4000', NULL, NULL, 1, '2026-04-28 01:57:15'),
(1024, 'ENGINE_TYPE', NULL, 'ENG_L4_28_DSL', 'L4 2.8L Turbo Intercooled (Diésel)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1026, 'ENGINE_TYPE', NULL, 'ENG_L4_25_GAS', 'L4 2.5L DOHC Multipunto (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1027, 'ENGINE_TYPE', NULL, 'ENG_V8_64_GAS', 'V8 6.4L HEMI MDS (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1028, 'ENGINE_TYPE', NULL, 'ENG_L4_24_DSL', 'L4 2.4L MIVEC Turbo (Diésel)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1029, 'ENGINE_TYPE', NULL, 'ENG_L4_20_DSL', 'L4 2.0L CTI Turbo (Diésel)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1030, 'ENGINE_TYPE', NULL, 'ENG_L4_14_GAS', 'L4 1.4L TSI Turbo (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1031, 'ENGINE_TYPE', NULL, 'ENG_L4_13_GAS', 'L4 1.3L Firefly (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1032, 'ENGINE_TYPE', NULL, 'ENG_L4_16_GAS', 'L4 1.6L DOHC (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1033, 'ENGINE_TYPE', NULL, 'ENG_L4_15_GAS', 'L4 1.5L DOHC (Gasolina)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1034, 'ENGINE_TYPE', NULL, 'ENG_L6_67_DSL', 'L6 6.7L Cummins Turbo (Diésel)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1035, 'ENGINE_TYPE', NULL, 'ENG_BEV_DUAL', 'Electric Dual-Motor (BEV)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1036, 'ENGINE_TYPE', NULL, 'ENG_L4_25_DSL', 'L4 2.5L Turbo (2KD-FTV Diésel)', NULL, NULL, 1, '2026-04-28 22:48:21'),
(1037, 'LOCATION', NULL, 'LOC_MINA', 'Mina', NULL, NULL, 1, '2026-04-29 00:01:40'),
(1038, 'LOCATION', NULL, 'LOC_PLANTA', 'Planta', NULL, NULL, 1, '2026-04-29 00:01:40'),
(1040, 'FUEL', NULL, 'F_LP_GAS', 'Gas LP / Natural', NULL, NULL, 1, '2026-04-29 00:25:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fleet_maintenance_logs`
--

CREATE TABLE `fleet_maintenance_logs` (
  `id` int(11) NOT NULL,
  `unit_id` varchar(50) NOT NULL,
  `service_date` date NOT NULL,
  `odometer_at_service` decimal(12,2) NOT NULL,
  `service_type` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT NULL,
  `technician` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `downtime_start` datetime DEFAULT NULL COMMENT 'Time when asset was stopped for service',
  `downtime_end` datetime DEFAULT NULL COMMENT 'Time when asset was released back to operations',
  `service_category` enum('Preventivo','Correctivo','Predictivo','Inspección') DEFAULT 'Preventivo' COMMENT 'Category for MTBF filtering',
  `is_failure` tinyint(1) DEFAULT 0 COMMENT 'Explicit flag for unscheduled breakdowns (MTBF trigger)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fleet_maintenance_schedules`
--

CREATE TABLE `fleet_maintenance_schedules` (
  `id` int(11) NOT NULL,
  `unit_id` varchar(10) NOT NULL,
  `scheduled_date` date NOT NULL,
  `task_description` varchar(255) NOT NULL,
  `priority` enum('Low','Medium','High','Critical') DEFAULT 'Medium',
  `status` enum('Pending','Completed','Overdue','Cancelled') DEFAULT 'Pending',
  `completion_date` date DEFAULT NULL,
  `maintenance_log_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fleet_routes`
--

CREATE TABLE `fleet_routes` (
  `id` int(11) NOT NULL,
  `unit_id` varchar(50) NOT NULL,
  `operator_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `start_odometer` decimal(10,2) DEFAULT NULL,
  `end_odometer` decimal(10,2) DEFAULT NULL,
  `status` enum('Asignada','En Ruta','Concluida') DEFAULT 'Asignada',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `started_at` timestamp NULL DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fleet_route_logs`
--

CREATE TABLE `fleet_route_logs` (
  `id` int(11) NOT NULL,
  `unit_id` varchar(50) NOT NULL,
  `operator_id` int(11) NOT NULL,
  `origin` varchar(150) DEFAULT NULL,
  `destination` varchar(150) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `start_km` decimal(12,2) NOT NULL,
  `end_km` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fleet_units`
--

CREATE TABLE `fleet_units` (
  `id` varchar(50) NOT NULL,
  `uuid` char(36) NOT NULL,
  `assetTypeId` int(11) DEFAULT NULL,
  `brandId` int(11) DEFAULT NULL,
  `modelId` int(11) DEFAULT NULL,
  `numeroSerie` varchar(100) DEFAULT NULL,
  `placas` text DEFAULT NULL,
  `circulationCardNumber` varchar(100) DEFAULT NULL,
  `placasHash` varchar(84) DEFAULT NULL,
  `numeroSerieHash` varchar(84) DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `year` int(11) NOT NULL COMMENT 'Manufacturing year',
  `departmentId` int(11) DEFAULT NULL,
  `locationId` int(11) DEFAULT NULL,
  `operationalUseId` int(11) DEFAULT NULL,
  `engineTypeId` int(11) DEFAULT NULL,
  `colorId` int(11) DEFAULT NULL,
  `traccionId` int(11) DEFAULT NULL,
  `transmisionId` int(11) DEFAULT NULL,
  `fuelTypeId` int(11) DEFAULT NULL,
  `tireBrandId` int(11) DEFAULT NULL,
  `terrainTypeId` int(11) DEFAULT NULL,
  `tireSpec` varchar(100) DEFAULT NULL,
  `capacidadCarga` decimal(10,2) DEFAULT NULL,
  `fuelTankCapacity` decimal(10,2) DEFAULT NULL,
  `odometer` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'km for Vehiculo, hrs for Maquinaria',
  `dailyUsageAvg` decimal(10,2) DEFAULT NULL,
  `maintenanceTimeFreqId` int(11) DEFAULT NULL,
  `maintenanceUsageFreqId` int(11) DEFAULT NULL,
  `lastServiceDate` date DEFAULT NULL,
  `lastServiceReading` decimal(12,2) DEFAULT NULL,
  `currentReading` decimal(12,2) DEFAULT NULL,
  `maintenanceCenterId` int(11) DEFAULT NULL,
  `protocolStartDate` date DEFAULT NULL,
  `insuranceExpiryDate` date DEFAULT NULL,
  `vencimientoVerificacion` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Disponible',
  `assignedOperatorId` int(11) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `description` text DEFAULT NULL,
  `availabilityIndex` decimal(5,2) DEFAULT 100.00,
  `mtbfHours` decimal(10,2) DEFAULT 0.00,
  `mttrHours` decimal(10,2) DEFAULT 0.00,
  `backlogCount` int(11) DEFAULT 0,
  `avgDailyKm` decimal(10,2) DEFAULT 0.00,
  `maintIntervalDays` int(11) DEFAULT NULL,
  `maintIntervalKm` decimal(12,2) DEFAULT NULL,
  `ownerId` int(11) DEFAULT NULL,
  `complianceStatusId` int(11) DEFAULT NULL,
  `accountingAccount` varchar(50) DEFAULT NULL,
  `legalComplianceDate` date DEFAULT NULL,
  `lastEnvironmentalVerification` date DEFAULT NULL,
  `lastMechanicalVerification` date DEFAULT NULL,
  `insuranceCompanyId` int(11) DEFAULT NULL,
  `insurancePolicyNumber` varchar(100) DEFAULT NULL,
  `monthlyLeasePayment` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `fleet_units`
--

INSERT INTO `fleet_units` (`id`, `uuid`, `assetTypeId`, `brandId`, `modelId`, `numeroSerie`, `placas`, `circulationCardNumber`, `placasHash`, `numeroSerieHash`, `images`, `year`, `departmentId`, `locationId`, `operationalUseId`, `engineTypeId`, `colorId`, `traccionId`, `transmisionId`, `fuelTypeId`, `tireBrandId`, `terrainTypeId`, `tireSpec`, `capacidadCarga`, `fuelTankCapacity`, `odometer`, `dailyUsageAvg`, `maintenanceTimeFreqId`, `maintenanceUsageFreqId`, `lastServiceDate`, `lastServiceReading`, `currentReading`, `maintenanceCenterId`, `protocolStartDate`, `insuranceExpiryDate`, `vencimientoVerificacion`, `status`, `assignedOperatorId`, `createdAt`, `updatedAt`, `description`, `availabilityIndex`, `mtbfHours`, `mttrHours`, `backlogCount`, `avgDailyKm`, `maintIntervalDays`, `maintIntervalKm`, `ownerId`, `complianceStatusId`, `accountingAccount`, `legalComplianceDate`, `lastEnvironmentalVerification`, `lastMechanicalVerification`, `insuranceCompanyId`, `insurancePolicyNumber`, `monthlyLeasePayment`) VALUES
('ASM-002', '70777042-435b-11f1-943b-0cd0f041778f', 1, 253, 636, '1D7HW48P87S256272', 'ZH-3153-B', 'TC-3153-2024', NULL, NULL, NULL, 2007, 228, 1037, 241, 1036, 1000, 20, 31, 11, 264, 269, '255/70 R15', 0.00, 80.00, 120763.00, 35.90, NULL, NULL, '2026-03-09', 119728.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1019, 'POL-3153-ARIAN', 14850.00),
('ASM-006', '70777a71-435b-11f1-943b-0cd0f041778f', 1, 23, 525, '3N6AD33C4GK892141', 'ZH-3161-B', 'TC-3161-2024', NULL, NULL, NULL, 2016, 228, 1037, 237, 1026, 1000, 20, 31, 11, 265, 271, '255/60 R18', 0.00, 80.00, 357833.00, 45.00, NULL, NULL, '2026-03-11', 356944.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8019-400-922', '2026-06-30', NULL, NULL, 1019, 'POL-3161-ARIAN', 13200.00),
('ASM-007', '70777ff1-435b-11f1-943b-0cd0f041778f', 1, 23, 525, '3N6AD33C5GK814774', 'ZH-3160-B', 'TC-3160-2024', NULL, NULL, NULL, 2016, 225, 1038, 239, 1026, 1000, 20, 31, 11, 266, 273, '205 R16', 0.00, 80.00, 327593.00, 15.00, NULL, NULL, '2026-03-11', 327333.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8012-548-390', '2026-06-30', NULL, NULL, 1019, 'POL-3160-ARIAN', 13200.00),
('ASM-008', '70778553-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0FA8CD8K3900944', 'TP-0477-H', 'TC-0477-2024', NULL, NULL, NULL, 2019, 229, 1037, 242, 1024, 1003, 21, 31, 10, 244, 269, '265/65 R17', 0.00, 80.00, 25955.00, 110.00, NULL, NULL, '2026-03-26', 23940.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8019-548-190', '2026-06-30', NULL, NULL, 1020, 'POL-0477-HUUR', 14850.00),
('ASM-009', '70778a80-435b-11f1-943b-0cd0f041778f', 1, 23, 528, '3N1CN8AE9SK599731', 'VEH-746-D', 'TC-746-2024', NULL, NULL, NULL, 2025, 231, 1037, 236, 1032, 1002, 20, 31, 11, 243, 272, '205/55 R16', 0.00, 41.00, 53460.00, 181.30, NULL, NULL, '2026-03-31', 51006.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8012-548-150', '2026-06-30', NULL, NULL, 1020, 'POL-746-HUUR', 9800.00),
('ASM-010', '70779000-435b-11f1-943b-0cd0f041778f', 1, 32, 553, 'LZWPRMGN6SF107290', 'UXS-682-E', 'TC-682-2024', NULL, NULL, NULL, 2025, 229, 1037, 236, 1033, 1000, 20, 31, 11, 243, 272, '185/60 R15', 0.00, 39.00, 22487.00, 228.90, NULL, NULL, '2026-03-13', 19680.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8019-548-190', '2026-06-30', NULL, NULL, 1020, 'POL-682-HUUR', 9800.00),
('ASM-011', '7077954a-435b-11f1-943b-0cd0f041778f', 1, 33, 1023, '3C7WRAKT6MG570165', 'ZH-3152-B', 'TC-3152-2024', NULL, NULL, NULL, 2021, 227, 1038, 239, 1027, 1000, 21, 31, 10, 244, 273, '235/80 R17', 0.00, 197.00, 45921.00, 56.40, NULL, NULL, '2025-10-24', 42400.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8019-548-390', '2026-06-30', NULL, NULL, 1019, 'POL-3152-ARIAN', 14850.00),
('ASM-012', '707799fe-435b-11f1-943b-0cd0f041778f', 1, 35, 572, 'MMBNLV56XNH055968', 'ZD-1550-B', 'TC-1550-2024', NULL, NULL, NULL, 2022, 222, 1037, 237, 1028, 1000, 21, 31, 10, 244, 271, '265/60 R18', 0.00, 75.00, 76146.00, 144.90, NULL, NULL, '2026-02-21', 74677.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 711, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1019, 'POL-1550-ARIAN', 14850.00),
('ASM-013', '70779ec8-435b-11f1-943b-0cd0f041778f', 1, 35, 572, 'MMBNLV563NH056251', 'ZD-1551-B', 'TC-1551-2024', NULL, NULL, NULL, 2022, 234, 1037, 275, 1028, 1000, 21, 31, 10, 244, 269, '245/70 R16', 0.00, 75.00, 55007.00, 43.90, NULL, NULL, '2026-01-13', 52573.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 711, 713, '8019-548-914', '2026-06-30', NULL, NULL, 1019, 'POL-1551-ARIAN', 14850.00),
('ASM-014', '7077a442-435b-11f1-943b-0cd0f041778f', 1, 35, 572, 'MMBNLV569NH055993', 'ZD-1552-B', 'TC-1552-2024', NULL, NULL, NULL, 2022, 224, 1037, 242, 1028, 1000, 21, 31, 10, 244, 269, '245/70 R16', 0.00, 75.00, 130876.00, 124.70, NULL, NULL, '2026-03-11', 127883.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 711, 713, '8012-548-140', '2026-06-30', NULL, NULL, 1019, 'POL-1552-ARIAN', 14850.00),
('ASM-015', '7077a938-435b-11f1-943b-0cd0f041778f', 1, 253, 642, 'MR2BF8C38P0005090', 'ZHY-780-E', 'TC-780-2024', NULL, NULL, NULL, 2023, 222, 1037, 236, 1033, 1010, 20, 31, 11, 243, 272, '185/60 R15', 0.00, 42.00, 161077.00, 210.30, NULL, NULL, '2025-12-29', 150000.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1019, 'POL-780-ARIAN', 9800.00),
('ASM-016', '7077ae1f-435b-11f1-943b-0cd0f041778f', 1, 33, 555, '9BD281H59PYY69987', 'YW-8191-D', 'TC-8191-2024', NULL, NULL, NULL, 2024, 230, 1038, 276, 1031, 1000, 20, 31, 11, 243, 273, '185/60 R15', 0.00, 55.00, 106610.00, 216.00, NULL, NULL, '2026-01-13', 96515.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8012-548-390', '2026-06-30', NULL, NULL, 1019, 'POL-8191-ARIAN', 9800.00),
('ASM-017', '7077b36b-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0DA3CXR4007222', 'TK-9722-H', 'TC-9722-2024', NULL, NULL, NULL, 2024, NULL, 1037, 242, 1024, 1003, 21, 31, 11, 244, 269, '265/65 R17', 0.00, 80.00, 51812.00, 104.90, NULL, NULL, '2026-03-27', 49627.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8019-548-190', '2026-06-30', NULL, NULL, 1020, 'POL-9722-HUUR', 14850.00),
('ASM-018', '7077b9ff-435b-11f1-943b-0cd0f041778f', 1, 37, 585, '3KPA24BC4NE456823', 'PCZ-11-91', 'TC-1191-2024', NULL, NULL, NULL, 2022, 227, 1038, 236, 1032, NULL, 20, 31, 11, 243, 272, '185/65 R15', 0.00, 45.00, 98391.00, 178.60, NULL, NULL, '2025-10-23', 96540.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8019-548-390', '2026-06-30', NULL, NULL, 1020, 'POL-1191-HUUR', 9800.00),
('ASM-019', '7077bf97-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MRDFA8CD3J3900638', 'TJ-7355-F', 'TC-7355-2024', NULL, NULL, NULL, 2018, 231, 1037, 275, 1024, 1000, 21, 31, 11, 244, 269, '265/65 R17', 0.00, 80.00, 137874.00, 74.70, NULL, NULL, '2026-03-26', 137423.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8012-548-150', '2026-06-30', NULL, NULL, 1020, 'POL-7355-HUUR', 14850.00),
('ASM-020', '7077c557-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0DA3CD7P4005053', 'TG-7053-H', 'TC-7053-2024', NULL, NULL, NULL, 2023, 223, 1037, 241, 1024, 1000, 21, 31, 10, 244, 270, '265/65 R17', 0.00, 80.00, 107467.00, 155.90, NULL, NULL, '2026-02-27', 100834.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8012-548-140', '2026-06-30', NULL, NULL, 1020, 'POL-7053-HUUR', 14850.00),
('ASM-021', '7077ca5e-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0DA3CD7P4004372', 'TM-33-95-G', 'TC-3395-2024', NULL, NULL, NULL, 2023, 231, 1037, 241, 1024, 1000, 21, 31, 10, 244, 269, '265/65 R17', 0.00, 80.00, 58774.00, 118.40, NULL, NULL, '2026-02-27', 56874.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8012-548-150', '2026-06-30', NULL, NULL, 1020, 'POL-3395-HUUR', 14850.00),
('ASM-022', '7077cfd1-435b-11f1-943b-0cd0f041778f', 1, 253, 642, 'MR2BF8C37P0023290', 'UWY-713-D', 'TC-713-2024', NULL, NULL, NULL, 2023, 232, 1037, 236, NULL, 1000, 20, 31, 11, 243, 272, '185/60 R15', 0.00, 42.00, 104782.00, 131.30, NULL, NULL, '2026-02-27', 100000.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1020, 'POL-713-HUUR', 9800.00),
('ASM-023', '7077d572-435b-11f1-943b-0cd0f041778f', 1, 34, 571, 'VSSAA75F8H6532319', 'UYM-047-C', 'TC-047-2024', NULL, NULL, NULL, 2017, 222, 1037, 236, 1030, 1000, 20, 31, 11, 243, 274, '215/55 R17', 0.00, 50.00, 30114.00, 99.70, NULL, NULL, '2026-02-26', 25496.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 03:44:30', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 712, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1020, 'POL-047-HUUR', 9800.00),
('ASM-024', '7077d9d2-435b-11f1-943b-0cd0f041778f', 1, 256, 654, '3GALD1593PM002498', 'YW-7900-D', 'TC-7900-2024', NULL, NULL, NULL, 2023, 233, 1037, 275, 1029, 1000, 21, 31, 10, 244, 269, '265/60 R18', 0.00, 76.00, 193129.00, 244.70, NULL, NULL, '2026-03-11', 186819.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 5000.00, 711, 713, '8019-548-902', '2026-06-30', NULL, NULL, 1019, 'POL-7900-ARIAN', 14850.00),
('ASM-025', '7077df84-435b-11f1-943b-0cd0f041778f', 1, 256, 653, '3GALJ1398RM003712', 'ZA-6811-D', 'TC-6811-2024', NULL, NULL, NULL, 2024, 222, 1037, 238, NULL, 1000, 20, 31, 10, 267, 273, '195/70 R15C', 0.00, 60.00, 59994.00, 145.60, NULL, NULL, '2026-03-19', 58209.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 180, 10000.00, 711, 713, '8019-548-901', '2026-06-30', NULL, NULL, 1019, 'POL-6811-ARIAN', 13200.00),
('ASM-026', '7077e46e-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0DA3CD4R4007281', 'TL-8939-H', 'TC-8939-2024', NULL, NULL, NULL, 2024, 224, 1037, 241, 1024, 1000, 21, 31, 10, 244, 269, '265/65 R17', 0.00, 80.00, 68103.00, 212.10, NULL, NULL, '2026-02-27', 61238.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8012-548-140', '2026-06-30', NULL, NULL, 1020, 'POL-8939-HUUR', 14850.00),
('ASM-027', '7077e931-435b-11f1-943b-0cd0f041778f', 1, 253, 636, 'MR0DA3CD9S4009937', 'TN-0201-H', 'TC-0201-2024', NULL, NULL, NULL, 2025, 229, 1037, 242, 1024, 1003, 21, 31, 10, 244, 269, '265/65 R17', 0.00, 80.00, 16332.00, 160.70, NULL, NULL, '2026-02-27', 11627.00, 0.00, 1012, NULL, '2026-12-15', '2026-06-30', 'Disponible', NULL, '2026-04-28 23:39:03', '2026-04-29 02:55:58', NULL, 100.00, 0.00, 0.00, 0, 0.00, 90, 5000.00, 712, 713, '8019-548-190', '2026-06-30', NULL, NULL, 1020, 'POL-0201-HUUR', 14850.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(0, 'Archon', 'Master system administrator with total emergency bypass', '2026-04-09 04:05:13'),
(1, 'Administrador', 'Operational manager with full control over fleet, routes, and personnel', '2026-04-09 04:05:13'),
(2, 'Operador', 'Field execution staff responsible for asset movement and route verification', '2026-04-09 04:05:13'),
(3, 'Técnico', 'Maintenance specialist in charge of work orders and technical health', '2026-04-21 05:55:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `employee_number` text DEFAULT NULL,
  `employee_number_hash` varchar(64) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `full_name` text DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `image_url` text DEFAULT NULL,
  `email_hash` varchar(64) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(11) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `department` varchar(100) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `employee_number`, `employee_number_hash`, `username`, `full_name`, `email`, `image_url`, `email_hash`, `password_hash`, `role_id`, `is_active`, `department`, `avatar_url`, `last_login`, `created_at`) VALUES
(1, 'Arc077', NULL, 'archon', NULL, '4ecc4be151c9f521a4555cc1:a88d6ce69871a4a7287a4e3d41e3e0de:946746b90659c80aaed18b9295ef8e321b', NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$Wt7CygY2fS5b2+BlzwA0JQ$cvaCJUL3RdLd1W4fauFBocc1ConGw0+Fn9FORwmyKnk', 996, 1, NULL, NULL, NULL, '2026-04-09 04:54:41'),
(5, 'PIIC01', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'aflores', 'Ana Karen Flores Baca', '698639d78bfe764d9cb8a37b:8bdbb8f0d8c394917355a0d8020d40fd:b89652bf99034ca12aec4ac27b5752b75d479f55c0', '', 'f6e0c6e202164f9b8c0df19ef973318f731765c9284218ea2090f42b36a7ed2a', '$argon2id$v=19$m=65536,t=3,p=4$saZ1ROGzxekYY8KzVaNBTQ$gNxBxq688qAxoZb5bRJbOtGNzq1HPu1S8f4iHPTXW+E', 997, 1, 'ADMINISTRACIÓN', NULL, NULL, '2026-04-21 05:55:32'),
(6, 'PIIC02', 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7d111f12a7a9', 'mflores', 'Miguel Angel Flores Ortiíz', 'ce5d062ee1fee3d89a291d5e:3f31fd46a5da375b0fc4292674183a7f:5e34798fda9ad5b409c6c5079c4efba38194a2de839a639f', '', '6b6b7f32997f6c3d97155097658700947c6a06612b70f07f45778a48c66a461e', '$argon2id$v=19$m=65536,t=3,p=4$yIuX/PR5UGrMFYZFu+bGQw$DP8mB7rcjm5u7Sjggw4PfyoHhPk6kYIYYfcQgU9+oxc', 999, 1, 'TALLER MECÁNICO', NULL, NULL, '2026-04-21 05:55:32'),
(7, 'PIIC03', '4e1243bd22c66e76c2ba9eddc1f91394e57f9f838634888365922e9652c366e6', 'lflores', 'Luis Miguel Flores Baca', '853ff017401d72b4299f07c7:8f3bcf1197b07a0b57c138b3657c1332:19a17ab56009a0eb45a5d68c837864724dd0a624486fea', '', '7967963d76717a6a7c6776106646b6a67f6772717075777876717a6a7e677275', '$argon2id$v=19$m=65536,t=3,p=4$uUnEnX+H07wTjvJBnXlHXQ$dEw7/HBUsQn+4KWLw1uUbLFhrfnDme7nUGYvLgpnQRE', 998, 1, 'OPERACIONES / RUTA', NULL, NULL, '2026-04-21 05:55:32');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `common_catalogs`
--
ALTER TABLE `common_catalogs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indices de la tabla `fleet_maintenance_logs`
--
ALTER TABLE `fleet_maintenance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mlog_unit` (`unit_id`);

--
-- Indices de la tabla `fleet_maintenance_schedules`
--
ALTER TABLE `fleet_maintenance_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `maintenance_log_id` (`maintenance_log_id`);

--
-- Indices de la tabla `fleet_routes`
--
ALTER TABLE `fleet_routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `unit_id` (`unit_id`);

--
-- Indices de la tabla `fleet_route_logs`
--
ALTER TABLE `fleet_route_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rlog_operator` (`operator_id`),
  ADD KEY `fk_rlog_unit` (`unit_id`);

--
-- Indices de la tabla `fleet_units`
--
ALTER TABLE `fleet_units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_uuid` (`uuid`),
  ADD UNIQUE KEY `uq_numero_serie` (`numeroSerie`),
  ADD UNIQUE KEY `idx_fleet_units_serie_hash` (`numeroSerieHash`),
  ADD UNIQUE KEY `uq_placas_hash` (`placasHash`),
  ADD KEY `fk_operator` (`assignedOperatorId`),
  ADD KEY `fk_unit_time_freq` (`maintenanceTimeFreqId`),
  ADD KEY `fk_unit_usage_freq` (`maintenanceUsageFreqId`),
  ADD KEY `fk_unit_asset_type` (`assetTypeId`),
  ADD KEY `fk_unit_fuel_type` (`fuelTypeId`),
  ADD KEY `fk_unit_traccion` (`traccionId`),
  ADD KEY `fk_unit_transmision` (`transmisionId`),
  ADD KEY `owner_id` (`ownerId`),
  ADD KEY `compliance_status_id` (`complianceStatusId`);

--
-- Indices de la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `idx_users_emp_hash` (`employee_number_hash`),
  ADD UNIQUE KEY `idx_users_email_hash` (`email_hash`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `common_catalogs`
--
ALTER TABLE `common_catalogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1041;

--
-- AUTO_INCREMENT de la tabla `fleet_maintenance_logs`
--
ALTER TABLE `fleet_maintenance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `fleet_maintenance_schedules`
--
ALTER TABLE `fleet_maintenance_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `fleet_routes`
--
ALTER TABLE `fleet_routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `fleet_route_logs`
--
ALTER TABLE `fleet_route_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `common_catalogs`
--
ALTER TABLE `common_catalogs`
  ADD CONSTRAINT `common_catalogs_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `common_catalogs` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `fleet_maintenance_logs`
--
ALTER TABLE `fleet_maintenance_logs`
  ADD CONSTRAINT `fk_mlog_unit` FOREIGN KEY (`unit_id`) REFERENCES `fleet_units` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `fleet_maintenance_schedules`
--
ALTER TABLE `fleet_maintenance_schedules`
  ADD CONSTRAINT `fleet_maintenance_schedules_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `fleet_units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fleet_maintenance_schedules_ibfk_2` FOREIGN KEY (`maintenance_log_id`) REFERENCES `fleet_maintenance_logs` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `fleet_routes`
--
ALTER TABLE `fleet_routes`
  ADD CONSTRAINT `fleet_routes_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `fleet_units` (`id`);

--
-- Filtros para la tabla `fleet_route_logs`
--
ALTER TABLE `fleet_route_logs`
  ADD CONSTRAINT `fk_rlog_operator` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rlog_unit` FOREIGN KEY (`unit_id`) REFERENCES `fleet_units` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `fleet_units`
--
ALTER TABLE `fleet_units`
  ADD CONSTRAINT `fk_operator` FOREIGN KEY (`assignedOperatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_unit_asset_type` FOREIGN KEY (`assetTypeId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fk_unit_fuel_type` FOREIGN KEY (`fuelTypeId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fk_unit_time_freq` FOREIGN KEY (`maintenanceTimeFreqId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fk_unit_traccion` FOREIGN KEY (`traccionId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fk_unit_transmision` FOREIGN KEY (`transmisionId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fk_unit_usage_freq` FOREIGN KEY (`maintenanceUsageFreqId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fleet_units_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fleet_units_ibfk_2` FOREIGN KEY (`complianceStatusId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fleet_units_ibfk_3` FOREIGN KEY (`ownerId`) REFERENCES `common_catalogs` (`id`),
  ADD CONSTRAINT `fleet_units_ibfk_4` FOREIGN KEY (`complianceStatusId`) REFERENCES `common_catalogs` (`id`);

--
-- Filtros para la tabla `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
