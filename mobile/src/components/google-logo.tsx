import Svg, { Path } from "react-native-svg";

type GoogleLogoProps = {
  size?: number;
};

export function GoogleLogo({ size = 22 }: GoogleLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.47a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.54-5.18 3.54-8.66Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3A7.2 7.2 0 0 1 12 19.36a7.15 7.15 0 0 1-6.75-4.94H1.24v3.1A12 12 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.25 14.42A7.2 7.2 0 0 1 4.85 12c0-.84.14-1.65.4-2.42v-3.1H1.24A12 12 0 0 0 0 12c0 1.93.46 3.76 1.24 5.52l4.01-3.1Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.64c1.76 0 3.34.6 4.58 1.78l3.43-3.43A11.93 11.93 0 0 0 12 0 12 12 0 0 0 1.24 6.48l4.01 3.1A7.15 7.15 0 0 1 12 4.64Z"
      />
    </Svg>
  );
}
