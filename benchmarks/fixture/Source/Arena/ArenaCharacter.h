#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "ArenaCharacter.generated.h"

UCLASS()
class ARENA_API AArenaCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AArenaCharacter();

	UFUNCTION(BlueprintCallable, Category = "Arena")
	void Hurt(float Amount);

	UFUNCTION(BlueprintCallable, Category = "Arena")
	void Sprint(bool bEnable);

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Arena")
	float MaxHealth = 100.f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Arena")
	float Health = 100.f;

	UPROPERTY(EditDefaultsOnly, Category = "Arena")
	float SprintMult = 1.5f;

private:
	float BaseWalkSpeed = 0.f;
};
