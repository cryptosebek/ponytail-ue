#include "ArenaCharacter.h"
#include "GameFramework/CharacterMovementComponent.h"

AArenaCharacter::AArenaCharacter()
{
	PrimaryActorTick.bCanEverTick = false;
}

void AArenaCharacter::Hurt(float Amount)
{
	Health = FMath::Clamp(Health - Amount, 0.f, MaxHealth);
}

void AArenaCharacter::Sprint(bool bEnable)
{
	UCharacterMovementComponent* Move = GetCharacterMovement();
	if (BaseWalkSpeed <= 0.f)
	{
		BaseWalkSpeed = Move->MaxWalkSpeed;
	}
	Move->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintMult : BaseWalkSpeed;
}
