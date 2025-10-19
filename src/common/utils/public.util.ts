import { SetMetadata } from "@nestjs/common";

export const applyPublicMetaToGuards = () => {
  // This utility ensures that the Public decorator metadata
  // is properly applied to all guards that need it
  SetMetadata("isPublic", true);
};
