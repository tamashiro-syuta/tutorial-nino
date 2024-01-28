import { authMiddleware, clerkClient, redirectToSignIn } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// NOTE: ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// NOTE: リダイレクトはどう制御するのが良いのか？
// NOTE > middleware で一元管理的に制御するアプローチをお勧めします。
// NOTE > 各ページコンポーネントで状態を取得してリダイレクトさせることもできますが、
// NOTE > その場合全体の関係性が把握しづらく、意図せず無限リダイレクトを発生させる可能性があります。
// NOTE > 現時点で　 Prisma が Edge に対応していないので DB に基づいたリダイレクトはできません。
// NOTE > そのため Clerk のメタデータを介してリダイレクトを制御しています。
// NOTE: https://zenn.dev/nino/books/30e21d37af73b5/viewer/onboarding#%E3%83%AA%E3%83%80%E3%82%A4%E3%83%AC%E3%82%AF%E3%83%88%E3%81%AF%E3%81%A9%E3%81%86%E5%88%B6%E5%BE%A1%E3%81%99%E3%82%8B%E3%81%AE%E3%81%8C%E8%89%AF%E3%81%84%E3%81%AE%E3%81%8B%EF%BC%9F
// NOTE: ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export default authMiddleware({
  publicRoutes: ['/'],
  async afterAuth(auth, req) {
    if (!auth.userId && auth.isPublicRoute) {
      return;
    }

    // 未ログインかつ非公開ルートへのアクセスはログイン画面へリダイレクト
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // セッションにオンボーディングの完了ステータスがあるか確認
    let onboarded = auth.sessionClaims?.onboarded;

    if (!onboarded) {
      // セッションになければClerkユーザー情報からステータスを取得
      const user = await clerkClient.users.getUser(auth.userId!);
      onboarded = user.publicMetadata.onboarded;
    }

    // オンボーディング前ならオンボーディングページへリダイレクト
    if (!onboarded && req.nextUrl.pathname !== '/onboarding') {
      const orgSelection = new URL('/onboarding', req.url);
      return NextResponse.redirect(orgSelection);
    }

    // オンボーディング済みでオンボーディングページへアクセスしたらトップページへリダイレクト
    if (onboarded && req.nextUrl.pathname === '/onboarding') {
      const orgSelection = new URL('/', req.url);
      return NextResponse.redirect(orgSelection);
    }
  },
});
