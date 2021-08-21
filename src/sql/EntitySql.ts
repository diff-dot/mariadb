/**
 * EntityWrite, Read Sql 클래스에서 사용할 공통 메소드 정의
 */
export class EntitySql {
  protected constructor() {
    //
  }

  /**
   * carmel case 로 작성된 컬럼명, 테이블명,db 명을 자동으로 snake case 로 변환
   *
   * @param str
   * @returns
   */
  protected toSnakecase(str: string): string {
    let result = '';
    let beforeCharCase: 'lower' | 'upper' = 'lower';

    for (let i = 0; i < str.length; i++) {
      const char = str.charAt(i);
      const lowerChar = char.toLowerCase();
      const charCase: 'lower' | 'upper' = char !== lowerChar ? 'upper' : 'lower';

      /**
       * 소문자 문자 뒤에 대문자가 발견된 경우 _ 를 추가
       *
       * < 예시 >
       * memberUid -> member_uid
       * memberUID -> member_uid
       */
      if (i !== 0 && charCase === 'upper' && beforeCharCase === 'lower') {
        result += '_';
      }

      result += lowerChar;
      beforeCharCase = charCase;
    }
    return result;
  }
}
