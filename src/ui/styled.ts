import styled from "styled-components";

export const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Row = styled.li`
  display: grid;
  grid-template-columns: auto 140px 120px 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font:
    14px/1.4 system-ui,
    sans-serif;
`;

export const Title = styled.span`
  font-weight: 600;
`;

const TONES = {
  info: "#0969da",
  ok: "#1a7f37",
  err: "#cf222e",
} as const;

export const Badge = styled.span<{ readonly $tone: keyof typeof TONES }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${(p) => TONES[p.$tone]};
`;
