import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export const WelcomeLandscape = ({ width, height }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 390 430"
    preserveAspectRatio="xMidYMax slice"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Defs>
      <LinearGradient id="skyMountain" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#A8D8A0" />
        <Stop offset="1" stopColor="#5D9B67" />
      </LinearGradient>
      <LinearGradient id="deepMountain" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#75AF72" />
        <Stop offset="1" stopColor="#32724A" />
      </LinearGradient>
      <LinearGradient id="forest" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#2F7D48" />
        <Stop offset="1" stopColor="#0F5132" />
      </LinearGradient>
      <LinearGradient id="foreground" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1D6B3F" />
        <Stop offset="1" stopColor="#083D2B" />
      </LinearGradient>
      <LinearGradient id="water" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#31A8C7" />
        <Stop offset="1" stopColor="#087D9E" />
      </LinearGradient>
    </Defs>

    <Path
      d="M0 171 C48 154 84 158 117 172 C151 150 186 129 221 137 C254 108 294 85 330 102 C351 89 371 81 390 79 L390 430 L0 430 Z"
      fill="url(#skyMountain)"
    />
    <Path
      d="M0 218 C42 197 72 196 102 207 C136 184 164 165 196 174 C225 143 255 127 286 139 C317 118 351 113 390 123 L390 430 L0 430 Z"
      fill="url(#deepMountain)"
      opacity="0.96"
    />

    <Path
      d="M117 300 C157 284 199 275 250 282 C291 287 332 272 390 252 L390 430 L117 430 Z"
      fill="url(#water)"
    />
    <Path
      d="M0 272 C50 250 87 257 126 281 C160 302 183 313 218 315 C185 329 150 344 122 372 C90 404 53 421 0 430 Z"
      fill="url(#forest)"
    />
    <Path
      d="M390 227 C347 236 319 254 294 279 C269 304 252 319 224 333 C259 341 296 360 322 387 C342 407 363 420 390 430 Z"
      fill="url(#forest)"
    />

    <Path
      d="M195 430 C196 399 213 378 241 360 C266 344 272 330 257 320 C247 313 230 309 218 307 C235 300 259 297 277 305 C299 316 299 337 278 356 C256 377 243 398 241 430 Z"
      fill="#F6E8C7"
    />
    <Path
      d="M218 411 C224 399 232 388 242 380"
      stroke="#D9BE88"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="8 11"
      fill="none"
    />
    <Path
      d="M247 369 C257 359 265 350 268 342"
      stroke="#D9BE88"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="8 11"
      fill="none"
    />

    <G transform="translate(14 186)">
      <Path
        d="M34 244 C31 196 31 145 39 96 C43 70 48 44 52 21"
        stroke="#0A422E"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M52 23 C29 20 15 9 3 0 C23 1 41 6 56 17"
        fill="#0B4B31"
      />
      <Path
        d="M53 23 C70 6 85 1 105 0 C94 12 80 21 57 29"
        fill="#0B4B31"
      />
      <Path
        d="M52 25 C30 30 18 44 9 60 C29 51 44 41 57 29"
        fill="#0B4B31"
      />
      <Path
        d="M55 24 C73 28 91 41 101 58 C81 48 69 39 55 31"
        fill="#0B4B31"
      />
      <Path
        d="M50 23 C42 5 41 -5 44 -19 C54 -4 58 7 56 23"
        fill="#0B4B31"
      />
    </G>

    <G opacity="0.98">
      <Ellipse cx="31" cy="371" rx="48" ry="26" fill="#125D39" transform="rotate(-20 31 371)" />
      <Ellipse cx="58" cy="401" rx="57" ry="29" fill="#0C4B32" transform="rotate(15 58 401)" />
      <Ellipse cx="103" cy="406" rx="55" ry="27" fill="#165F38" transform="rotate(-11 103 406)" />
      <Ellipse cx="353" cy="365" rx="51" ry="26" fill="#195F3C" transform="rotate(20 353 365)" />
      <Ellipse cx="340" cy="405" rx="66" ry="31" fill="#0A472F" transform="rotate(-17 340 405)" />
      <Ellipse cx="286" cy="412" rx="49" ry="23" fill="#17633C" transform="rotate(12 286 412)" />
    </G>

    <G opacity="0.9">
      <Path d="M4 430 C10 391 18 366 34 344 C27 380 30 405 40 430 Z" fill="#082F23" />
      <Path d="M22 430 C31 393 47 369 65 350 C50 386 51 409 59 430 Z" fill="#0B3B29" />
      <Path d="M386 430 C378 390 368 363 348 342 C360 381 357 406 350 430 Z" fill="#082F23" />
      <Path d="M365 430 C356 390 339 366 321 350 C336 385 336 408 328 430 Z" fill="#0B3B29" />
    </G>

    <Circle cx="300" cy="167" r="4" fill="#E7F1DF" opacity="0.4" />
    <Circle cx="317" cy="182" r="2.5" fill="#E7F1DF" opacity="0.35" />
  </Svg>
);
