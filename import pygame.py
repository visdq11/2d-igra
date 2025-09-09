import pygame
import random
import sys
import math

# Инициализация Pygame
pygame.init()

# Константы
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
ROAD_WIDTH = 400
CAR_WIDTH = 60
CAR_HEIGHT = 100
PERSON_WIDTH = 30
PERSON_HEIGHT = 50
BOX_WIDTH = 40
BOX_HEIGHT = 40
SPEED_INCREMENT = 0.2
MAX_SPEED = 15

# Цвета
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 200, 0)
GRAY = (100, 100, 100)
BROWN = (139, 69, 19)
BLUE = (0, 120, 255)
YELLOW = (255, 255, 0)
DARK_GREEN = (0, 100, 0)
LIGHT_BLUE = (135, 206, 235)
ORANGE = (255, 165, 0)
SILVER = (192, 192, 192)
PURPLE = (128, 0, 128)
DARK_BLUE = (0, 0, 139)
DARK_GRAY = (50, 50, 50)
LIGHT_YELLOW = (255, 255, 200)
NIGHT_BLUE = (25, 25, 112)
MOON_LIGHT = (220, 220, 220)
STAR_COLOR = (255, 255, 200)

# Настройка экрана
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Городское безумие")
clock = pygame.time.Clock()

# Загрузка изображений (заглушки, которые мы нарисуем сами)
def create_car_surface(color, car_type):
    surface = pygame.Surface((CAR_WIDTH, CAR_HEIGHT), pygame.SRCALPHA)
    
    # Базовые цвета для деталей
    window_color = (180, 230, 255, 200)  # Полупрозрачное стекло
    light_color = YELLOW
    wheel_color = (20, 20, 20)
    wheel_rim = (100, 100, 100)
    
    if car_type == "mercedes":
        # Основной кузов
        pygame.draw.rect(surface, color, (5, 15, CAR_WIDTH-10, CAR_HEIGHT-30), border_radius=8)
        # Капот и багажник
        pygame.draw.rect(surface, color, (0, 5, CAR_WIDTH, 10), border_radius=3)
        pygame.draw.rect(surface, color, (0, CAR_HEIGHT-25, CAR_WIDTH, 10), border_radius=3)
        # Лобовое стекло
        pygame.draw.rect(surface, window_color, (10, 20, CAR_WIDTH-20, 15), border_radius=5)
        # Боковые стекла
        pygame.draw.rect(surface, window_color, (5, 35, 10, 30), border_radius=2)
        pygame.draw.rect(surface, window_color, (CAR_WIDTH-15, 35, 10, 30), border_radius=2)
        # Фары
        pygame.draw.ellipse(surface, light_color, (5, 5, 12, 8))
        pygame.draw.ellipse(surface, light_color, (CAR_WIDTH-17, 5, 12, 8))
        pygame.draw.ellipse(surface, RED, (5, CAR_HEIGHT-15, 12, 8))
        pygame.draw.ellipse(surface, RED, (CAR_WIDTH-17, CAR_HEIGHT-15, 12, 8))
        # Колёса
        pygame.draw.ellipse(surface, wheel_color, (8, 8, 16, 16))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-24, 8, 16, 16))
        pygame.draw.ellipse(surface, wheel_color, (8, CAR_HEIGHT-24, 16, 16))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-24, CAR_HEIGHT-24, 16, 16))
        pygame.draw.ellipse(surface, wheel_rim, (10, 10, 12, 12))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-22, 10, 12, 12))
        pygame.draw.ellipse(surface, wheel_rim, (10, CAR_HEIGHT-22, 12, 12))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-22, CAR_HEIGHT-22, 12, 12))
        # Эмблема Mercedes
        pygame.draw.circle(surface, SILVER, (CAR_WIDTH//2, CAR_HEIGHT//2), 8, 2)
        pygame.draw.circle(surface, SILVER, (CAR_WIDTH//2, CAR_HEIGHT//2), 5, 1)
        
    elif car_type == "bmw":
        # Спортивный кузов
        pygame.draw.rect(surface, color, (3, 10, CAR_WIDTH-6, CAR_HEIGHT-25), border_radius=10)
        # Лобовое стекло
        pygame.draw.rect(surface, window_color, (8, 15, CAR_WIDTH-16, 12), border_radius=4)
        # Боковые стекла
        pygame.draw.rect(surface, window_color, (5, 27, 8, 25), border_radius=2)
        pygame.draw.rect(surface, window_color, (CAR_WIDTH-13, 27, 8, 25), border_radius=2)
        # Фары
        pygame.draw.ellipse(surface, light_color, (5, 8, 10, 7))
        pygame.draw.ellipse(surface, light_color, (CAR_WIDTH-15, 8, 10, 7))
        pygame.draw.ellipse(surface, RED, (8, CAR_HEIGHT-18, 10, 7))
        pygame.draw.ellipse(surface, RED, (CAR_WIDTH-18, CAR_HEIGHT-18, 10, 7))
        # Решётка радиатора
        pygame.draw.rect(surface, (40, 40, 40), (CAR_WIDTH//2-10, 5, 20, 8), border_radius=2)
        for i in range(4):
            pygame.draw.line(surface, (60, 60, 60), (CAR_WIDTH//2-8+i*5, 5), (CAR_WIDTH//2-8+i*5, 13), 1)
        # Колёса
        pygame.draw.ellipse(surface, wheel_color, (10, 10, 14, 14))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-24, 10, 14, 14))
        pygame.draw.ellipse(surface, wheel_color, (10, CAR_HEIGHT-24, 14, 14))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-24, CAR_HEIGHT-24, 14, 14))
        pygame.draw.ellipse(surface, wheel_rim, (12, 12, 10, 10))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-22, 12, 10, 10))
        pygame.draw.ellipse(surface, wheel_rim, (12, CAR_HEIGHT-22, 10, 10))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-22, CAR_HEIGHT-22, 10, 10))
        # Эмблема BMW
        pygame.draw.circle(surface, BLUE, (CAR_WIDTH//2, CAR_HEIGHT//2), 10)
        pygame.draw.circle(surface, WHITE, (CAR_WIDTH//2, CAR_HEIGHT//2), 8)
        for i in range(4):
            angle = i * 90
            pygame.draw.arc(surface, BLUE, (CAR_WIDTH//2-8, CAR_HEIGHT//2-8, 16, 16), 
                           angle * 3.14/180, (angle+45) * 3.14/180, 3)
        
    elif car_type == "lamborghini":
        # Низкий спортивный кузов
        pygame.draw.rect(surface, color, (0, 20, CAR_WIDTH, CAR_HEIGHT-30), border_radius=8)
        # Лобовое стекло
        pygame.draw.polygon(surface, window_color, [(10, 25), (CAR_WIDTH-10, 25), (CAR_WIDTH-5, 35), (5, 35)])
        # Боковые стекла
        pygame.draw.rect(surface, window_color, (8, 35, 10, 15), border_radius=2)
        pygame.draw.rect(surface, window_color, (CAR_WIDTH-18, 35, 10, 15), border_radius=2)
        # Фары
        pygame.draw.ellipse(surface, light_color, (5, CAR_HEIGHT-20, 12, 8))
        pygame.draw.ellipse(surface, light_color, (CAR_WIDTH-17, CAR_HEIGHT-20, 12, 8))
        # Выхлопная труба
        pygame.draw.rect(surface, (50, 50, 50), (CAR_WIDTH//2-5, CAR_HEIGHT-10, 10, 5))
        # Колёса
        pygame.draw.ellipse(surface, wheel_color, (8, 15, 14, 12))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-22, 15, 14, 12))
        pygame.draw.ellipse(surface, wheel_color, (8, CAR_HEIGHT-27, 14, 12))
        pygame.draw.ellipse(surface, wheel_color, (CAR_WIDTH-22, CAR_HEIGHT-27, 14, 12))
        pygame.draw.ellipse(surface, wheel_rim, (10, 17, 10, 8))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-20, 17, 10, 8))
        pygame.draw.ellipse(surface, wheel_rim, (10, CAR_HEIGHT-25, 10, 8))
        pygame.draw.ellipse(surface, wheel_rim, (CAR_WIDTH-20, CAR_HEIGHT-25, 10, 8))
        # Декоративные линии
        pygame.draw.line(surface, BLACK, (15, 25), (30, 35), 2)
        pygame.draw.line(surface, BLACK, (CAR_WIDTH-15, 25), (CAR_WIDTH-30, 35), 2)
        # Воздухозаборник
        pygame.draw.rect(surface, (40, 40, 40), (CAR_WIDTH//2-15, 40, 30, 5), border_radius=2)
        
    elif car_type == "zhiguli":  # Жигули
        # Угловатый кузов
        pygame.draw.rect(surface, color, (0, 15, CAR_WIDTH, CAR_HEIGHT-25))
        # Лобовое стекло
        pygame.draw.rect(surface, window_color, (5, 20, CAR_WIDTH-10, 15))
        # Боковые стекла
        pygame.draw.rect(surface, window_color, (3, 35, 6, 20))
        pygame.draw.rect(surface, window_color, (CAR_WIDTH-9, 35, 6, 20))
        # Фары
        pygame.draw.rect(surface, light_color, (5, CAR_HEIGHT-20, 10, 5))
        pygame.draw.rect(surface, light_color, (CAR_WIDTH-15, CAR_HEIGHT-20, 10, 5))
        pygame.draw.rect(surface, RED, (8, 5, 8, 5))
        pygame.draw.rect(surface, RED, (CAR_WIDTH-16, 5, 8, 5))
        # Колёса
        pygame.draw.rect(surface, wheel_color, (8, 10, 14, 10))
        pygame.draw.rect(surface, wheel_color, (CAR_WIDTH-22, 10, 14, 10))
        pygame.draw.rect(surface, wheel_color, (8, CAR_HEIGHT-20, 14, 10))
        pygame.draw.rect(surface, wheel_color, (CAR_WIDTH-22, CAR_HEIGHT-20, 14, 10))
        pygame.draw.rect(surface, wheel_rim, (10, 12, 10, 6))
        pygame.draw.rect(surface, wheel_rim, (CAR_WIDTH-20, 12, 10, 6))
        pygame.draw.rect(surface, wheel_rim, (10, CAR_HEIGHT-18, 10, 6))
        pygame.draw.rect(surface, wheel_rim, (CAR_WIDTH-20, CAR_HEIGHT-18, 10, 6))
        # Характерная решётка
        pygame.draw.rect(surface, (40, 40, 40), (CAR_WIDTH//2-15, CAR_HEIGHT-25, 30, 5))
        for i in range(5):
            pygame.draw.line(surface, (60, 60, 60), (CAR_WIDTH//2-15+i*6, CAR_HEIGHT-25), 
                            (CAR_WIDTH//2-15+i*6, CAR_HEIGHT-20), 1)
        # Ручки дверей
        pygame.draw.rect(surface, BLACK, (20, 40, 5, 2))
        pygame.draw.rect(surface, BLACK, (CAR_WIDTH-25, 40, 5, 2))
    
    # Добавляем блики для реалистичности
    highlight = pygame.Surface((CAR_WIDTH, CAR_HEIGHT), pygame.SRCALPHA)
    pygame.draw.ellipse(highlight, (255, 255, 255, 30), (CAR_WIDTH//2, 10, CAR_WIDTH//2, 20))
    surface.blit(highlight, (0, 0))
    
    return surface

def create_person_surface():
    surface = pygame.Surface((PERSON_WIDTH, PERSON_HEIGHT), pygame.SRCALPHA)
    # Голова
    pygame.draw.circle(surface, (255, 200, 150), (PERSON_WIDTH // 2, 10), 8)
    # Тело
    pygame.draw.rect(surface, BLUE, (10, 18, PERSON_WIDTH - 20, 20))
    # Ноги
    pygame.draw.rect(surface, BLACK, (8, 38, 5, 12))
    pygame.draw.rect(surface, BLACK, (PERSON_WIDTH - 13, 38, 5, 12))
    # Руки
    pygame.draw.rect(surface, (255, 200, 150), (5, 25, 5, 10))
    pygame.draw.rect(surface, (255, 200, 150), (PERSON_WIDTH - 10, 25, 5, 10))
    # Лицо
    pygame.draw.circle(surface, BLACK, (PERSON_WIDTH//2-3, 8), 1)
    pygame.draw.circle(surface, BLACK, (PERSON_WIDTH//2+3, 8), 1)
    pygame.draw.arc(surface, BLACK, (PERSON_WIDTH//2-4, 10, 8, 5), 0, 3.14, 1)
    return surface

def create_box_surface():
    surface = pygame.Surface((BOX_WIDTH, BOX_HEIGHT), pygame.SRCALPHA)
    # Основной корпус коробки
    pygame.draw.rect(surface, ORANGE, (0, 0, BOX_WIDTH, BOX_HEIGHT))
    # Тень
    pygame.draw.rect(surface, (200, 100, 0, 100), (2, 2, BOX_WIDTH-4, BOX_HEIGHT-4))
    # Полосы на коробке
    pygame.draw.rect(surface, BROWN, (0, 0, BOX_WIDTH, BOX_HEIGHT), 2)
    pygame.draw.line(surface, BROWN, (0, 0), (BOX_WIDTH, BOX_HEIGHT), 2)
    pygame.draw.line(surface, BROWN, (BOX_WIDTH, 0), (0, BOX_HEIGHT), 2)
    # Надпись
    font = pygame.font.SysFont(None, 20)
    text = font.render("FRAGILE", True, BLACK)
    surface.blit(text, (BOX_WIDTH//2 - text.get_width()//2, BOX_HEIGHT//2 - text.get_height()//2))
    return surface

def create_tree_surface():
    surface = pygame.Surface((60, 100), pygame.SRCALPHA)
    # Ствол
    pygame.draw.rect(surface, BROWN, (25, 50, 10, 50))
    # Крона
    pygame.draw.circle(surface, DARK_GREEN, (30, 40), 25)
    # Детализация кроны
    for _ in range(10):
        x = random.randint(10, 50)
        y = random.randint(20, 60)
        r = random.randint(3, 8)
        pygame.draw.circle(surface, (0, 120, 0), (x, y), r)
    return surface

def create_house_surface():
    surface = pygame.Surface((80, 80), pygame.SRCALPHA)
    # Основной корпус
    pygame.draw.rect(surface, RED, (0, 30, 80, 50))
    # Кирпичная текстура
    for i in range(0, 80, 10):
        for j in range(30, 80, 5):
            pygame.draw.rect(surface, (180, 0, 0 if (i+j) % 20 == 0 else 150, 0, 0), (i, j, 10, 5), 1)
    # Крыша
    pygame.draw.polygon(surface, BROWN, [(0, 30), (40, 0), (80, 30)])
    # Черепица
    for i in range(0, 80, 8):
        pygame.draw.line(surface, (100, 50, 0), (i, 30), (i+4, 25), 2)
        pygame.draw.line(surface, (100, 50, 0), (i+4, 25), (i+8, 30), 2)
    # Окно
    pygame.draw.rect(surface, LIGHT_BLUE, (20, 45, 20, 20))
    pygame.draw.rect(surface, (100, 100, 100), (20, 45, 20, 20), 2)
    # Переплет окна
    pygame.draw.line(surface, (100, 100, 100), (30, 45), (30, 65), 2)
    pygame.draw.line(surface, (100, 100, 100), (20, 55), (40, 55), 2)
    # Дверь
    pygame.draw.rect(surface, (139, 69, 19), (50, 45, 20, 35))
    pygame.draw.circle(surface, BLACK, (65, 62), 2)  # Ручка
    return surface

def create_rocket_surface():
    surface = pygame.Surface((40, 80), pygame.SRCALPHA)
    # Корпус ракеты
    pygame.draw.rect(surface, (150, 150, 150), (10, 0, 20, 60))
    # Детали корпуса
    pygame.draw.rect(surface, (100, 100, 100), (15, 10, 10, 40))
    # Нос ракеты
    pygame.draw.polygon(surface, (200, 0, 0), [(10, 0), (30, 0), (20, -15)])
    # Окно
    pygame.draw.circle(surface, LIGHT_BLUE, (20, 20), 5)
    pygame.draw.circle(surface, (100, 200, 255), (20, 20), 3)
    # Огненный хвост
    pygame.draw.polygon(surface, (255, 165, 0), [(10, 60), (30, 60), (20, 80)])
    pygame.draw.polygon(surface, (255, 0, 0), [(12, 60), (28, 60), (20, 75)])
    # Пламя
    for i in range(5):
        x = random.randint(12, 28)
        y = random.randint(65, 78)
        pygame.draw.circle(surface, (255, 255, 0), (x, y), random.randint(1, 3))
    return surface

# Класс машины
class Car:
    def __init__(self, car_type="mercedes", color=None):
        self.x = SCREEN_WIDTH // 2 - CAR_WIDTH // 2
        self.y = SCREEN_HEIGHT - CAR_HEIGHT - 20
        self.speed = 5
        self.type = car_type
        
        # Цвета для разных машин
        if color:
            self.color = color
        else:
            if car_type == "mercedes":
                self.color = SILVER
            elif car_type == "bmw":
                self.color = BLUE
            elif car_type == "lamborghini":
                self.color = YELLOW
            elif car_type == "zhiguli":
                self.color = RED
                
        self.surface = create_car_surface(self.color, self.type)
    
    def move(self, direction):
        if direction == "left" and self.x > (SCREEN_WIDTH - ROAD_WIDTH) // 2:
            self.x -= self.speed
        if direction == "right" and self.x < (SCREEN_WIDTH + ROAD_WIDTH) // 2 - CAR_WIDTH:
            self.x += self.speed
    
    def draw(self):
        screen.blit(self.surface, (self.x, self.y))
    
    def increase_speed(self):
        if self.speed < MAX_SPEED:
            self.speed += SPEED_INCREMENT

# Класс человека
class Person:
    def __init__(self):
        road_left = (SCREEN_WIDTH - ROAD_WIDTH) // 2
        self.x = random.randint(road_left, road_left + ROAD_WIDTH - PERSON_WIDTH)
        self.y = -PERSON_HEIGHT
        self.speed = random.randint(2, 5)
        self.surface = create_person_surface()
        self.hit = False
    
    def update(self):
        self.y += self.speed
    
    def draw(self):
        if not self.hit:
            screen.blit(self.surface, (self.x, self.y))
    
    def check_collision(self, car):
        if (not self.hit and 
            self.x < car.x + CAR_WIDTH and 
            self.x + PERSON_WIDTH > car.x and 
            self.y < car.y + CAR_HEIGHT and 
            self.y + PERSON_HEIGHT > car.y):
            self.hit = True
            return True
        return False

# Класс коробки (препятствие)
class Box:
    def __init__(self):
        road_left = (SCREEN_WIDTH - ROAD_WIDTH) // 2
        self.x = random.randint(road_left, road_left + ROAD_WIDTH - BOX_WIDTH)
        self.y = -BOX_HEIGHT
        self.speed = random.randint(3, 6)
        self.surface = create_box_surface()
    
    def update(self):
        self.y += self.speed
    
    def draw(self):
        screen.blit(self.surface, (self.x, self.y))
    
    def check_collision(self, car):
        if (self.x < car.x + CAR_WIDTH and 
            self.x + BOX_WIDTH > car.x and 
            self.y < car.y + CAR_HEIGHT and 
            self.y + BOX_HEIGHT > car.y):
            return True
        return False
    
    def is_off_screen(self):
        return self.y > SCREEN_HEIGHT

# Класс декораций (деревья, дома)
class Decoration:
    def __init__(self, type_name, side):
        self.type = type_name
        self.side = side  # "left" или "right"
        
        if self.type == "tree":
            self.surface = create_tree_surface()
            self.width = 60
            self.height = 100
        elif self.type == "house":
            self.surface = create_house_surface()
            self.width = 80
            self.height = 80
        elif self.type == "rocket":
            self.surface = create_rocket_surface()
            self.width = 40
            self.height = 80
            
        road_left = (SCREEN_WIDTH - ROAD_WIDTH) // 2
        
        if self.side == "left":
            self.x = random.randint(10, road_left - self.width - 10)
        else:
            self.x = random.randint(road_left + ROAD_WIDTH + 10, SCREEN_WIDTH - self.width - 10)
            
        self.y = -self.height
        self.speed = random.randint(1, 3)
    
    def update(self):
        self.y += self.speed
    
    def draw(self):
        screen.blit(self.surface, (self.x, self.y))
    
    def is_off_screen(self):
        return self.y > SCREEN_HEIGHT

# Класс выбора машины
class CarSelection:
    def __init__(self):
        self.cars = [
            {"type": "mercedes", "name": "Mercedes", "default_color": SILVER},
            {"type": "bmw", "name": "BMW", "default_color": BLUE},
            {"type": "lamborghini", "name": "Lamborghini", "default_color": YELLOW},
            {"type": "zhiguli", "name": "Жигули", "default_color": RED}
        ]
        self.selected_index = 0
        self.car_surfaces = []
        self.color_options = [RED, BLUE, GREEN, YELLOW, PURPLE, SILVER, BLACK, ORANGE]
        self.selected_color_index = 0
        self.time_of_day_options = ["day", "night", "sunset"]
        self.selected_time_index = 0
        
        # Создаем поверхности для всех машин с цветами по умолчанию
        for car in self.cars:
            self.car_surfaces.append(create_car_surface(car["default_color"], car["type"]))
    
    def draw(self):
        # Фон
        screen.fill(LIGHT_BLUE)
        
        # Заголовок
        font = pygame.font.SysFont(None, 72)
        title = font.render("Выберите машину", True, BLACK)
        screen.blit(title, (SCREEN_WIDTH//2 - title.get_width()//2, 30))
        
        # Рисуем все машины
        spacing = SCREEN_WIDTH // (len(self.cars) + 1)
        for i, car_surface in enumerate(self.car_surfaces):
            x = spacing * (i + 1) - CAR_WIDTH // 2
            y = SCREEN_HEIGHT // 2 - CAR_HEIGHT // 2 - 30
            
            # Подсвечиваем выбранную машину
            if i == self.selected_index:
                pygame.draw.rect(screen, GREEN, (x-10, y-10, CAR_WIDTH+20, CAR_HEIGHT+20), 3)
            
            screen.blit(car_surface, (x, y))
            
            # Название машины
            font = pygame.font.SysFont(None, 36)
            name_text = font.render(self.cars[i]["name"], True, BLACK)
            screen.blit(name_text, (x + CAR_WIDTH//2 - name_text.get_width()//2, y + CAR_HEIGHT + 20))
        
        # Рисуем выбор цвета
        font = pygame.font.SysFont(None, 36)
        color_text = font.render("Выберите цвет:", True, BLACK)
        screen.blit(color_text, (SCREEN_WIDTH//2 - color_text.get_width()//2, SCREEN_HEIGHT//2 + 80))
        
        color_spacing = 40
        for i, color in enumerate(self.color_options):
            x = SCREEN_WIDTH//2 - (len(self.color_options) * color_spacing)//2 + i * color_spacing
            y = SCREEN_HEIGHT//2 + 120
            pygame.draw.rect(screen, color, (x, y, 30, 30))
            if i == self.selected_color_index:
                pygame.draw.rect(screen, WHITE, (x-2, y-2, 34, 34), 2)
        
        # Рисуем выбор времени суток
        time_text = font.render("Время суток:", True, BLACK)
        screen.blit(time_text, (SCREEN_WIDTH//2 - time_text.get_width()//2, SCREEN_HEIGHT//2 + 160))
        
        time_options = ["День", "Ночь", "Закат"]
        for i, option in enumerate(time_options):
            x = SCREEN_WIDTH//2 - (len(time_options) * 100)//2 + i * 100
            y = SCREEN_HEIGHT//2 + 200
            color = BLACK if i != self.selected_time_index else GREEN
            option_text = font.render(option, True, color)
            screen.blit(option_text, (x, y))
            if i == self.selected_time_index:
                pygame.draw.rect(screen, GREEN, (x-5, y-5, option_text.get_width()+10, option_text.get_height()+10), 2)
        
        # Инструкция
        font = pygame.font.SysFont(None, 30)
        instr1 = font.render("Используйте ← → для выбора машины", True, BLACK)
        instr2 = font.render("Стрелки вверх/вниз для выбора цвета", True, BLACK)
        instr3 = font.render("Цифры 1-3 для выбора времени суток", True, BLACK)
        instr4 = font.render("Нажмите ENTER для начала игры", True, BLACK)
        
        screen.blit(instr1, (SCREEN_WIDTH//2 - instr1.get_width()//2, SCREEN_HEIGHT - 140))
        screen.blit(instr2, (SCREEN_WIDTH//2 - instr2.get_width()//2, SCREEN_HEIGHT - 110))
        screen.blit(instr3, (SCREEN_WIDTH//2 - instr3.get_width()//2, SCREEN_HEIGHT - 80))
        screen.blit(instr4, (SCREEN_WIDTH//2 - instr4.get_width()//2, SCREEN_HEIGHT - 50))
    
    def handle_input(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_LEFT:
                self.selected_index = (self.selected_index - 1) % len(self.cars)
                self.update_car_surface()
            elif event.key == pygame.K_RIGHT:
                self.selected_index = (self.selected_index + 1) % len(self.cars)
                self.update_car_surface()
            elif event.key == pygame.K_UP:
                self.selected_color_index = (self.selected_color_index - 1) % len(self.color_options)
                self.update_car_surface()
            elif event.key == pygame.K_DOWN:
                self.selected_color_index = (self.selected_color_index + 1) % len(self.color_options)
                self.update_car_surface()
            elif event.key == pygame.K_1:
                self.selected_time_index = 0
            elif event.key == pygame.K_2:
                self.selected_time_index = 1
            elif event.key == pygame.K_3:
                self.selected_time_index = 2
            elif event.key == pygame.K_RETURN:
                return {
                    "car_type": self.cars[self.selected_index]["type"],
                    "car_color": self.color_options[self.selected_color_index],
                    "time_of_day": self.time_of_day_options[self.selected_time_index]
                }
        return None
    
    def update_car_surface(self):
        self.car_surfaces[self.selected_index] = create_car_surface(
            self.color_options[self.selected_color_index], 
            self.cars[self.selected_index]["type"]
        )

# Класс игры
class Game:
    def __init__(self, car_type="mercedes", car_color=None, time_of_day="day"):
        self.car = Car(car_type, car_color)
        self.people = []
        self.boxes = []
        self.decorations = []
        self.score = 0
        self.level = 1
        self.target = 10  # Цель для первого уровня
        self.game_over = False
        self.win = False
        self.spawn_timer = 0
        self.box_spawn_timer = 0
        self.decoration_timer = 0
        self.road_lines = []
        self.time_of_day = time_of_day
        self.stars = []
        self.init_road_lines()
        self.init_stars()
    
    def init_stars(self):
        if self.time_of_day == "night":
            for _ in range(50):
                self.stars.append({
                    "x": random.randint(0, SCREEN_WIDTH),
                    "y": random.randint(0, SCREEN_HEIGHT//2),
                    "size": random.randint(1, 3),
                    "brightness": random.randint(200, 255)
                })
    
    def init_road_lines(self):
        # Создаем линии разметки на дороге
        road_center = SCREEN_WIDTH // 2
        line_spacing = 50
        for y in range(-40, SCREEN_HEIGHT + 40, line_spacing):
            self.road_lines.append({"x": road_center - 5, "y": y, "width": 10, "height": 20})
    
    def update_road_lines(self):
        # Обновляем позиции линий разметки
        for line in self.road_lines:
            line["y"] += self.car.speed / 2
            if line["y"] > SCREEN_HEIGHT:
                line["y"] = -40
    
    def draw_sky(self):
        if self.time_of_day == "day":
            # Дневное небо
            screen.fill(LIGHT_BLUE)
            # Солнце
            pygame.draw.circle(screen, YELLOW, (SCREEN_WIDTH - 100, 100), 40)
            # Облака
            for i in range(3):
                x = (SCREEN_WIDTH // 4) * i + 50
                y = 80 + (i * 20)
                pygame.draw.circle(screen, WHITE, (x, y), 20)
                pygame.draw.circle(screen, WHITE, (x+15, y-10), 15)
                pygame.draw.circle(screen, WHITE, (x+30, y), 20)
                pygame.draw.circle(screen, WHITE, (x+15, y+10), 15)
        
        elif self.time_of_day == "night":
            # Ночное небо
            screen.fill(NIGHT_BLUE)
            # Луна
            pygame.draw.circle(screen, MOON_LIGHT, (SCREEN_WIDTH - 100, 100), 30)
            pygame.draw.circle(screen, NIGHT_BLUE, (SCREEN_WIDTH - 120, 90), 25)
            # Звезды
            for star in self.stars:
                pygame.draw.circle