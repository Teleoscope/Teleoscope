import { Link, Stack } from '@mui/material';
import { Flare } from '@mui/icons-material';

interface TeleoscopeLogoProps {
    color?: string;
    hoverColor?: string;
    href?: string;
    textDecorationColor?: string;
    compact?: boolean;
    iconSize?: string | number;
    fontSize?: string | number;
}

export default function TeleoscopeLogo({
    color = 'inherit',
    hoverColor,
    textDecorationColor,
    href = "https://github.com/Teleoscope/Teleoscope",
    compact = false,
    iconSize = 'default',
    fontSize = 'inherit'
}: TeleoscopeLogoProps) {
    const defaultHoverColor = hoverColor || color;
    const defaultTextDecorationColor = textDecorationColor || color;

    return (
        <Stack direction={compact ? 'column' : 'row'} alignItems="center">
            <Flare
                sx={{
                    color,
                    fontSize: iconSize,
                    marginRight: compact ? 0 : '0.33em',
                    '&:hover': {
                        color: defaultHoverColor,
                    },
                }}
            />
            <Link
                href={href}
                underline="hover"
                sx={{
                    fontWeight: 'fontWeightLight',
                    fontFamily: 'monospace',
                    color,
                    textDecorationColor: defaultTextDecorationColor,
                    fontSize,
                    '&:hover': {
                        color: defaultHoverColor,
                        textDecorationColor: defaultTextDecorationColor,
                    },
                }}
            >
                {!compact && 'Teleoscope'}
            </Link>
        </Stack>
    );
}
