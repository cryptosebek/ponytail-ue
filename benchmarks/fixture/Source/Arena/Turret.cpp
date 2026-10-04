#include "Turret.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"

ATurret::ATurret()
{
	PrimaryActorTick.bCanEverTick = false;
}

APawn* ATurret::FindTarget() const
{
	APawn* Best = nullptr;
	float BestDistSq = FMath::Square(Range);
	for (TActorIterator<APawn> It(GetWorld()); It; ++It)
	{
		const float DistSq = FVector::DistSquared(It->GetActorLocation(), GetActorLocation());
		if (DistSq < BestDistSq)
		{
			Best = *It;
			BestDistSq = DistSq;
		}
	}
	return Best;
}

void ATurret::Fire()
{
	if (APawn* Target = FindTarget())
	{
		UE_LOG(LogTemp, Log, TEXT("%s fires at %s"), *GetName(), *Target->GetName());
	}
}
