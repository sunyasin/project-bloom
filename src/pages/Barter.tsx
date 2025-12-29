import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeftRight, Lock } from "lucide-react";

const Barter = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Бартерон</h1>
          <p className="text-muted-foreground mt-1">
            Платформа для обмена товарами между производителями
          </p>
        </div>

        <div className="content-card text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Скоро</span>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Раздел находится в разработке. Здесь вы сможете обмениваться товарами с другими производителями без использования денег.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Barter;
