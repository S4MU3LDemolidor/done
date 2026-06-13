import { createContext, useContext } from "react";
import { groupColor } from "../../lib/colors";
import type { GroupColors } from "../../lib/store";

const GroupColorContext = createContext<GroupColors>({});

export const GroupColorProvider = GroupColorContext.Provider;

/** Retorna a cor de um grupo respeitando as escolhas do usuário. */
export function useGroupColor(name: string): string {
  const colors = useContext(GroupColorContext);
  return groupColor(name, colors);
}
