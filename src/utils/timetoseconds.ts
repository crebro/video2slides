export default function convertTimeToSeconds(timeStr: string): number {
    const [hh, mm, ss] = timeStr.split(':');
    return (+hh) * 3600 + (+mm) * 60 + (+ss);
}
