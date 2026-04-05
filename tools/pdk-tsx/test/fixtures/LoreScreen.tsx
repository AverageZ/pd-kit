type Props = {
  choice: number;
};

export function LoreScreen({ choice }: Props) {
  return (
    <Screen border="standard">
      <Layout y={30} lineGap={20} marginX={40}>
        <Paragraph>
          Champion of the Tilt at Eshkar's Ford! The crowd roars as you raise
          your lance.
        </Paragraph>
        <Divider />
        <MenuItem selected={choice === 0}>Continue</MenuItem>
        <MenuItem selected={choice === 1}>Return to camp</MenuItem>
      </Layout>
    </Screen>
  );
}
