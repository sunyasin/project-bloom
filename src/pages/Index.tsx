import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ============= Mock API для подписки на новости =============

// Данные текущего пользователя
const mockAPICurrentUser = {
  id: "1",
  email: "ivan@example.com",
};

// Имитация подписки на новости (POST /api/newsletter/subscribe)
const mockAPISubscribeNewsletter = async (email: string) => {
  console.log(`[mockAPI] POST /api/newsletter/subscribe`, { email });
  // Имитация задержки сети
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, message: "Подписка оформлена" };
};

// ============= End Mock API =============


// Mock promotions data
const mockPromotions = [
  {
    id: "1",
    title: "Скидка 20% на мёд",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
    description: "Только до конца месяца! Скидка 20% на весь ассортимент мёда от Пасеки Иванова. Натуральный мёд прямо с пасеки.",
    business: "Пасека Иванова",
    validUntil: "31.01.2025",
  },
  {
    id: "2",
    title: "2+1 на молочные продукты",
    image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop",
    description: "Акция 2+1 на все молочные продукты! Купите 2 товара и получите третий в подарок. Свежее молоко, творог, сметана.",
    business: "Ферма Петровых",
    validUntil: "15.02.2025",
  },
  {
    id: "3",
    title: "Свежие овощи со скидкой",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
    description: "Свежие сезонные овощи со скидкой до 30%. Только экологически чистая продукция без химикатов.",
    business: "Эко-овощи",
    validUntil: "28.02.2025",
  },
  {
    id: "4",
    title: "Хлеб по старинным рецептам",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    description: "Попробуйте наш новый хлеб по старинным рецептам! Скидка 15% на первую покупку.",
    business: "Хлебный дом",
    validUntil: "10.02.2025",
  },
  {
    id: "5",
    title: "Домашние яйца",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop",
    description: "Домашние яйца от кур свободного выгула. Скидка 10% при покупке от 30 штук.",
    business: "Птицеферма Солнечная",
    validUntil: "20.02.2025",
  },
  {
    id: "6",
    title: "Сыры ручной работы",
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
    description: "Авторские сыры ручной работы со скидкой 25%. Попробуйте уникальные вкусы от местных сыроваров.",
    business: "Сырная лавка",
    validUntil: "05.03.2025",
  },
];

// Mock events data
const mockWeekEvents = [
  { id: "1", title: "Ярмарка выходного дня в центре города с участием местных производителей", date: "28.12", logo: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=50&h=50&fit=crop" },
  { id: "2", title: "Мастер-класс по сыроварению от Сырной лавки для всех желающих", date: "29.12", logo: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=50&h=50&fit=crop" },
  { id: "3", title: "Дегустация новых сортов мёда на Пасеке Иванова", date: "30.12", logo: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=50&h=50&fit=crop" },
  { id: "4", title: "Новогодняя распродажа на Ферме Петровых со скидками до 50%", date: "31.12", logo: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=50&h=50&fit=crop" },
  { id: "5", title: "Открытие нового магазина Эко-овощей в районе старого города", date: "02.01", logo: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=50&h=50&fit=crop" },
  { id: "6", title: "Кулинарный фестиваль с участием лучших производителей региона", date: "03.01", logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=50&h=50&fit=crop" },
  { id: "7", title: "Экскурсия на птицеферму Солнечная для школьников и взрослых", date: "04.01", logo: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=50&h=50&fit=crop" },
  { id: "8", title: "Зимний фермерский рынок под открытым небом с горячим чаем", date: "05.01", logo: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=50&h=50&fit=crop" },
  { id: "9", title: "Презентация новой линейки хлеба в Хлебном доме с дегустацией", date: "06.01", logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=50&h=50&fit=crop" },
  { id: "10", title: "Встреча с производителями органических продуктов в конференц-зале", date: "07.01", logo: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=50&h=50&fit=crop" },
];


// Mock categories data
const mockCategories = [
  { id: "1", name: "Выпечка", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop" },
  { id: "2", name: "Колбасы", image: "https://images.unsplash.com/photo-1558030006-450675393462?w=200&h=200&fit=crop" },
  { id: "3", name: "Консервы", image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=200&h=200&fit=crop" },
  { id: "4", name: "Крупы", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop" },
  { id: "5", name: "Молочные продукты", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop" },
  { id: "6", name: "Мёд", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
  { id: "7", name: "Мясо", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop" },
  { id: "8", name: "Овощи", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop" },
  { id: "9", name: "Птица", image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&h=200&fit=crop" },
  { id: "10", name: "Рыба", image: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=200&h=200&fit=crop" },
  { id: "11", name: "Сыры", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
  { id: "12", name: "Фрукты", image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop" },
  { id: "13", name: "Яйца", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop" },
].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

// Mock news data - Valley news
const mockAPIValleyNews = [
  { id: "1", title: "Открытие нового фермерского рынка в центре долины запланировано на весну следующего года" },
  { id: "2", title: "Долина получила грант на развитие экологического земледелия от регионального фонда" },
  { id: "3", title: "Новые правила сертификации органической продукции вступают в силу с января" },
  { id: "4", title: "Фестиваль урожая собрал рекордное количество участников и посетителей" },
  { id: "5", title: "Программа поддержки молодых фермеров расширяется на новые районы области" },
  { id: "6", title: "В долине построят современный логистический центр для фермерской продукции" },
  { id: "7", title: "Кооперация производителей позволила снизить затраты на доставку на 30%" },
  { id: "8", title: "Экологический аудит подтвердил высокое качество почв в западной части долины" },
  { id: "9", title: "Запущена программа обучения для начинающих производителей с бесплатными курсами" },
  { id: "10", title: "Долина вошла в топ-5 регионов по производству органической продукции" },
  { id: "11", title: "Новые технологии капельного орошения внедряются на фермах региона" },
  { id: "12", title: "Ассоциация производителей провела ежегодное собрание и выбрала новое руководство" },
];

// Mock news data - Producer news
const mockAPIProducerNews = [
  { id: "1", title: "Пасека Иванова получила золотую медаль на международной выставке мёда в Москве" },
  { id: "2", title: "Ферма Петровых расширяет производство и открывает новый цех переработки молока" },
  { id: "3", title: "Эко-овощи запустили доставку свежих продуктов прямо с грядки к дому покупателя" },
  { id: "4", title: "Хлебный дом представил линейку безглютеновых изделий для аллергиков" },
  { id: "5", title: "Птицеферма Солнечная увеличила поголовье кур и расширила ассортимент продукции" },
  { id: "6", title: "Сырная лавка освоила производство сыров с плесенью по французской технологии" },
  { id: "7", title: "Рыбное хозяйство Озёрное начало выращивать форель премиум-класса для ресторанов" },
  { id: "8", title: "Виноградник Южный собрал рекордный урожай и планирует выпуск вина нового сорта" },
  { id: "9", title: "Мясной двор получил сертификат халяль и расширяет рынки сбыта продукции" },
  { id: "10", title: "Травяная ферма Полевая начала экспорт сушёных трав в страны Европы" },
  { id: "11", title: "Ягодный сад Лесной запустил производство натуральных джемов без сахара" },
  { id: "12", title: "Кондитерская Сладкий дом открыла школу выпечки для всех желающих" },
  { id: "13", title: "Молочная ферма Альпийская представила новую линейку йогуртов с ягодами" },
  { id: "14", title: "Овощевод Зелёная долина построил теплицы для круглогодичного выращивания" },
];

const Index = () => {
  const [selectedPromotion, setSelectedPromotion] = useState<typeof mockPromotions[0] | null>(null);
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState(mockAPICurrentUser.email);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Promotions Carousel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Актуальные акции</h2>
            <Link to="/promotions" className="text-sm text-primary hover:underline">
              Все акции →
            </Link>
          </div>
          
          <div className="relative">
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3">
                {mockPromotions.map((promo) => (
                  <CarouselItem
                    key={promo.id}
                    className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4"
                  >
                    <button
                      onClick={() => setSelectedPromotion(promo)}
                      className="w-full text-left content-card p-0 overflow-hidden hover:border-primary/30 transition-all hover:shadow-md group"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={promo.image}
                          alt={promo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-foreground text-sm truncate">
                          {promo.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {promo.business}
                        </p>
                      </div>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 -translate-x-1/2" />
              <CarouselNext className="right-0 translate-x-1/2" />
            </Carousel>
          </div>
        </section>

        {/* Events of the Week */}
        <section id="events">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">События недели</h2>
            <Link to="/events" className="text-sm text-primary hover:underline whitespace-nowrap">
              Все →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockWeekEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <img
                  src={event.logo}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{event.date}</p>
                  <p className="text-sm text-foreground leading-tight line-clamp-2">
                    {event.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Категории</h2>
            <Link to="/categories" className="text-sm text-primary hover:underline">
              Все →
            </Link>
          </div>
          
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))" }}>
            {mockCategories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="flex flex-col items-center p-2 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group"
              >
                <div className="w-full aspect-square rounded-md overflow-hidden mb-2">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-foreground text-center truncate w-full">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* News Section - 2 columns */}
        <section id="news">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valley News Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title mb-0 text-base">Новости долины</h2>
                <Link to="/news?type=valley" className="text-sm text-primary hover:underline">
                  Все →
                </Link>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {mockAPIValleyNews.slice(0, 10).map((news) => (
                  <Link
                    key={news.id}
                    to={`/news/${news.id}`}
                    className="block px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm text-foreground leading-snug line-clamp-2">
                      {news.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Producer News Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title mb-0 text-base">Новости производителей</h2>
                <Link to="/news?type=producers" className="text-sm text-primary hover:underline">
                  Все →
                </Link>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {mockAPIProducerNews.slice(0, 10).map((news) => (
                  <Link
                    key={news.id}
                    to={`/news/${news.id}`}
                    className="block px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm text-foreground leading-snug line-clamp-2">
                      {news.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Subscribe Button */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setIsSubscribeDialogOpen(true)}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Подписка на новости
          </Button>
        </div>
      </div>

      {/* Promotion Details Dialog */}
      <Dialog open={!!selectedPromotion} onOpenChange={() => setSelectedPromotion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPromotion?.title}</DialogTitle>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={selectedPromotion.image}
                  alt={selectedPromotion.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="text-foreground">{selectedPromotion.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedPromotion.business}</span>
                  <span>До {selectedPromotion.validUntil}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Newsletter Subscribe Dialog */}
      <Dialog open={isSubscribeDialogOpen} onOpenChange={setIsSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подписка на новости</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Подпишитесь на рассылку и получайте новости долины и производителей на вашу почту.
            </p>
            <div className="space-y-2">
              <Label htmlFor="subscribe-email">Email</Label>
              <Input
                id="subscribe-email"
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={async () => {
                setIsSubscribing(true);
                try {
                  await mockAPISubscribeNewsletter(subscribeEmail);
                  toast({
                    title: "Успешно!",
                    description: "Вы подписаны на новости",
                  });
                  setIsSubscribeDialogOpen(false);
                } catch (error) {
                  toast({
                    title: "Ошибка",
                    description: "Не удалось оформить подписку",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubscribing(false);
                }
              }}
              disabled={isSubscribing || !subscribeEmail}
            >
              {isSubscribing ? "Подписка..." : "Подписаться"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;
