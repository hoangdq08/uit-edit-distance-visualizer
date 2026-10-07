#include <stdio.h>
#include <string.h>

char s[5005], t[5005];
int buf1[5005], buf2[5005];

static int min3(int a, int b, int c) {
    int m = a < b ? a : b;
    return m < c ? m : c;
}

int main(void) {
    int n, m, i, j, *prev = buf1, *cur = buf2, *tmp;

    scanf("%5004s", s);
    scanf("%5004s", t);
    n = (int)strlen(s);
    m = (int)strlen(t);

    for (j = 0; j <= m; j++) prev[j] = j;
    for (i = 1; i <= n; i++) {
        cur[0] = i;
        for (j = 1; j <= m; j++) {
            if (s[i - 1] == t[j - 1]) cur[j] = prev[j - 1];
            else cur[j] = 1 + min3(prev[j - 1], prev[j], cur[j - 1]);
        }
        tmp = prev; prev = cur; cur = tmp;
    }
    printf("%d\n", prev[m]);
    return 0;
}
