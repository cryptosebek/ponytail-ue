#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Turret.generated.h"

UCLASS()
class ARENA_API ATurret : public AActor
{
	GENERATED_BODY()

public:
	ATurret();

	// Closest pawn within Range, or nullptr.
	UFUNCTION(BlueprintCallable, Category = "Arena")
	APawn* FindTarget() const;

	UFUNCTION(BlueprintCallable, Category = "Arena")
	void Fire();

	UPROPERTY(EditDefaultsOnly, Category = "Arena")
	float Range = 1500.f;
};
